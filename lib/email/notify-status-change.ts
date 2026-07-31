import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient, EMAIL_FROM } from "@/lib/email/resend";
import ObjectStatusEmail from "@/emails/object-status-email";
import type { AssignedRole, ObjectRow } from "@/lib/types/database";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

type AssigneeRow = {
  assigned_role: AssignedRole;
  resource: { full_name: string; email: string; email_notifications_enabled: boolean } | null;
};

/** Fires on a status change, gated entirely by admin-configured data rather
 * than a hard-coded list of statuses: Settings → Object statuses has an
 * "Email" checkbox per status (picklists.notify_email) — if the status
 * being moved into doesn't have it checked, this is a silent no-op.
 *
 * When it is checked, both the functional and technical consultants
 * currently assigned to the object are notified, except anyone whose own
 * Add/Edit Resource "Email" checkbox is unchecked
 * (resources.email_notifications_enabled) — a per-recipient opt-out.
 * Also silently no-ops if nobody eligible is assigned, or if Resend isn't
 * configured. A failed send is logged, never thrown — it should never
 * block the status update itself. */
export async function notifyObjectStatusChange(objectId: string, projectId: string, newStatus: string) {
  if (!process.env.RESEND_API_KEY) return;

  const admin = createAdminClient();

  const [{ data: object }, { data: project }] = await Promise.all([
    admin.from("objects").select("*").eq("id", objectId).maybeSingle(),
    admin.from("projects").select("id, name, org_id").eq("id", projectId).maybeSingle(),
  ]);
  if (!object || !project) return;
  const objectRow = object as ObjectRow;

  const { data: statusPicklist } = await admin
    .from("picklists")
    .select("notify_email")
    .eq("org_id", project.org_id)
    .eq("type", "status")
    .eq("value", newStatus)
    .eq("is_active", true)
    .maybeSingle();

  if (!statusPicklist?.notify_email) return;

  const [{ data: assignments }, { data: members }] = await Promise.all([
    admin
      .from("object_assignments")
      .select("assigned_role, resource:resources(full_name, email, email_notifications_enabled)")
      .eq("object_id", objectId),
    admin
      .from("project_members")
      .select("profile:profiles(email)")
      .eq("project_id", projectId)
      .eq("is_active", true)
      .in("role", ["project_manager", "technical_lead", "pmo"]),
  ]);

  const rows = (assignments ?? []) as unknown as AssigneeRow[];
  const developer = rows.find((a) => a.assigned_role === "developer")?.resource ?? null;
  const functional = rows.find((a) => a.assigned_role === "functional")?.resource ?? null;

  const eligible = [developer, functional].filter(
    (r): r is NonNullable<typeof r> => !!r && r.email_notifications_enabled !== false,
  );
  const toEmails = Array.from(new Set(eligible.map((r) => r.email)));
  if (toEmails.length === 0) return; // nobody assigned (or opted out) to notify

  const ccSet = new Set<string>();
  for (const m of (members ?? []) as unknown as { profile: { email: string } | null }[]) {
    if (m.profile?.email) ccSet.add(m.profile.email);
  }
  for (const email of toEmails) ccSet.delete(email); // never cc someone already in "to"

  const recipientName = eligible.length === 1 ? eligible[0].full_name : "team";
  const heading = `Now in ${newStatus}`;
  const message = `This object has moved to ${newStatus}.`;
  const subject = `${heading} — ${objectRow.wricef_id ?? objectRow.title} (${project.name})`;

  try {
    const sendResult = await getResendClient().emails.send({
      from: EMAIL_FROM,
      to: toEmails,
      cc: ccSet.size ? Array.from(ccSet) : undefined,
      subject,
      react: ObjectStatusEmail({
        recipientName,
        heading,
        message,
        objectTitle: objectRow.title,
        wricefId: objectRow.wricef_id,
        projectName: project.name,
        status: newStatus,
        dueDate: objectRow.due_date,
        technicalName: developer?.full_name ?? null,
        functionalName: functional?.full_name ?? null,
        appUrl: APP_URL,
      }),
    });

    await admin.from("email_log").insert({
      type: "status_change",
      to_email: toEmails.join(", "),
      subject,
      project_id: projectId,
      status: sendResult.error ? "failed" : "sent",
      provider_id: sendResult.data?.id ?? null,
      error: sendResult.error?.message ?? null,
    });
  } catch (err) {
    await admin.from("email_log").insert({
      type: "status_change",
      to_email: toEmails.join(", "),
      subject,
      project_id: projectId,
      status: "failed",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

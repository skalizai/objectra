import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient, EMAIL_FROM } from "@/lib/email/resend";
import ObjectStatusEmail from "@/emails/object-status-email";
import type { AssignedRole, ObjectRow } from "@/lib/types/database";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

interface StatusTrigger {
  status: string;
  /** Which side of the assignment gets the email. */
  recipientRole: AssignedRole;
  heading: string;
  message: string;
  counterpartLabel: string;
}

/** The three status transitions that fire a notification (see
 * Settings → Object statuses for the full pipeline) — everything else is
 * silent. Matched by exact status value, so renaming a status in Settings
 * also renames it here without code changes; if a status is renamed
 * entirely, update the `status` values below to match. */
const STATUS_TRIGGERS: StatusTrigger[] = [
  {
    status: "Development in Progress",
    recipientRole: "developer",
    heading: "New object assigned to you",
    message:
      "This object has moved to Development in Progress and is now assigned to you. If you need clarification on the requirements, reach out to the functional consultant below.",
    counterpartLabel: "Functional consultant",
  },
  {
    status: "Functional Testing in Development",
    recipientRole: "functional",
    heading: "Ready for functional testing",
    message:
      "Development on this object is complete. It's ready for functional testing — you can begin whenever you're ready.",
    counterpartLabel: "Technical consultant",
  },
  {
    status: "Awaiting for FSD",
    recipientRole: "functional",
    heading: "FSD needed to start development",
    message:
      "The technical team is ready to begin work on this object but is waiting on the Functional Specification Document (FSD). Please share it as soon as it's ready so development can start.",
    counterpartLabel: "Technical consultant",
  },
];

type AssigneeRow = { assigned_role: AssignedRole; resource: { full_name: string; email: string } | null };

/** Fires on a status change to one of the three tracked transitions —
 * called from updateObjectByManager/memberUpdateObject, never awaited by
 * the caller (best-effort: a failed send shouldn't block the status
 * update itself, and is logged to email_log either way). Silently no-ops
 * if the status isn't one of the tracked transitions, if nobody is
 * assigned to the relevant side yet, or if Resend isn't configured. */
export async function notifyObjectStatusChange(objectId: string, projectId: string, newStatus: string) {
  const trigger = STATUS_TRIGGERS.find((t) => t.status === newStatus);
  if (!trigger) return;
  if (!process.env.RESEND_API_KEY) return;

  const admin = createAdminClient();

  const [{ data: object }, { data: project }, { data: assignments }, { data: members }] = await Promise.all([
    admin.from("objects").select("*").eq("id", objectId).maybeSingle(),
    admin.from("projects").select("id, name").eq("id", projectId).maybeSingle(),
    admin
      .from("object_assignments")
      .select("assigned_role, resource:resources(full_name, email)")
      .eq("object_id", objectId),
    admin
      .from("project_members")
      .select("profile:profiles(email)")
      .eq("project_id", projectId)
      .eq("is_active", true)
      .in("role", ["project_manager", "technical_lead", "pmo"]),
  ]);

  if (!object || !project) return;
  const objectRow = object as ObjectRow;

  const rows = (assignments ?? []) as unknown as AssigneeRow[];
  const recipient = rows.find((a) => a.assigned_role === trigger.recipientRole)?.resource;
  if (!recipient?.email) return; // nobody assigned to that side yet — nothing to send

  const counterpartRole: AssignedRole = trigger.recipientRole === "developer" ? "functional" : "developer";
  const counterpart = rows.find((a) => a.assigned_role === counterpartRole)?.resource;

  const ccEmails = Array.from(
    new Set(
      ((members ?? []) as unknown as { profile: { email: string } | null }[])
        .map((m) => m.profile?.email)
        .filter((email): email is string => !!email && email !== recipient.email),
    ),
  );

  const subject = `${trigger.heading} — ${objectRow.wricef_id ?? objectRow.title} (${project.name})`;

  try {
    const sendResult = await getResendClient().emails.send({
      from: EMAIL_FROM,
      to: recipient.email,
      cc: ccEmails.length ? ccEmails : undefined,
      subject,
      react: ObjectStatusEmail({
        recipientName: recipient.full_name,
        heading: trigger.heading,
        message: trigger.message,
        objectTitle: objectRow.title,
        wricefId: objectRow.wricef_id,
        projectName: project.name,
        status: newStatus,
        dueDate: objectRow.due_date,
        counterpartLabel: counterpart ? trigger.counterpartLabel : null,
        counterpartName: counterpart?.full_name ?? null,
        appUrl: APP_URL,
      }),
    });

    await admin.from("email_log").insert({
      type: "status_change",
      to_email: recipient.email,
      subject,
      project_id: projectId,
      status: sendResult.error ? "failed" : "sent",
      provider_id: sendResult.data?.id ?? null,
      error: sendResult.error?.message ?? null,
    });
  } catch (err) {
    await admin.from("email_log").insert({
      type: "status_change",
      to_email: recipient.email,
      subject,
      project_id: projectId,
      status: "failed",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

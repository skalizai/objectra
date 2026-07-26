import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient, EMAIL_FROM } from "@/lib/email/resend";
import ObjectStatusEmail from "@/emails/object-status-email";
import type { AssignedRole, ObjectRow } from "@/lib/types/database";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

interface StatusTrigger {
  status: string;
  /** Who gets a "to" — usually one side, but Live goes to both. */
  recipientRoles: AssignedRole[];
  /** When true (and there's exactly one recipient role), the other side
   * gets CC'd instead of just mentioned in the body — used for UAT, where
   * the functional consultant should actually receive the heads-up. */
  ccCounterpart?: boolean;
  heading: string;
  message: string;
}

/** The status transitions that fire a notification (see Settings → Object
 * statuses for the full pipeline) — everything else is silent. Matched by
 * exact status value, so renaming a status in Settings also renames it
 * here without code changes; if a status is renamed entirely, update the
 * `status` values below to match. */
const STATUS_TRIGGERS: StatusTrigger[] = [
  {
    status: "Development in Progress",
    recipientRoles: ["developer"],
    heading: "New object assigned to you",
    message:
      "This object has moved to Development in Progress and is now assigned to you. If you need clarification on the requirements, reach out to the functional consultant below.",
  },
  {
    status: "Functional Testing in Development",
    recipientRoles: ["functional"],
    heading: "Ready for functional testing",
    message:
      "Development on this object is complete. It's ready for functional testing — you can begin whenever you're ready.",
  },
  {
    status: "Awaiting for FSD",
    recipientRoles: ["functional"],
    heading: "FSD needed to start development",
    message:
      "The technical team is ready to begin work on this object but is waiting on the Functional Specification Document (FSD). Please share it as soon as it's ready so development can start.",
  },
  {
    status: "UAT in progress",
    recipientRoles: ["developer"],
    ccCounterpart: true,
    heading: "UAT started — please stay available",
    message:
      "Testing for the object you developed has started in UAT. Please be available in case any changes come up that need to be reverted or fixed based on testing feedback.",
  },
  {
    status: "Functional Testing in Quality",
    recipientRoles: ["functional", "developer"],
    heading: "Now in Functional Testing in Quality",
    message:
      "This object has moved to Functional Testing in Quality. Functional consultant — please begin testing. Technical consultant — you may be needed to support any corrections that come up during testing.",
  },
  {
    status: "Live",
    recipientRoles: ["developer", "functional"],
    heading: "Now live in production",
    message:
      "This object has been successfully deployed and is now live in production. Thank you both for your work getting it here.",
  },
];

type AssigneeRow = { assigned_role: AssignedRole; resource: { full_name: string; email: string } | null };

/** Fires on a status change to one of the tracked transitions — called
 * from updateObjectByManager/memberUpdateObject. Silently no-ops if the
 * status isn't tracked, if nobody's assigned to the relevant side(s), or
 * if Resend isn't configured. A failed send is logged, never thrown —
 * it should never block the status update itself. */
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

  const developer = rows.find((a) => a.assigned_role === "developer")?.resource ?? null;
  const functional = rows.find((a) => a.assigned_role === "functional")?.resource ?? null;
  const byRole: Record<AssignedRole, { full_name: string; email: string } | null> = { developer, functional };

  const toEmails = Array.from(
    new Set(trigger.recipientRoles.map((role) => byRole[role]?.email).filter((email): email is string => !!email)),
  );
  if (toEmails.length === 0) return; // nobody assigned to the relevant side(s) yet

  const ccSet = new Set<string>();
  for (const m of (members ?? []) as unknown as { profile: { email: string } | null }[]) {
    if (m.profile?.email) ccSet.add(m.profile.email);
  }
  if (trigger.ccCounterpart && trigger.recipientRoles.length === 1) {
    const counterpartRole: AssignedRole = trigger.recipientRoles[0] === "developer" ? "functional" : "developer";
    const counterpartEmail = byRole[counterpartRole]?.email;
    if (counterpartEmail) ccSet.add(counterpartEmail);
  }
  for (const email of toEmails) ccSet.delete(email); // never cc someone already in "to"

  const recipientName =
    toEmails.length === 1 && trigger.recipientRoles.length === 1
      ? byRole[trigger.recipientRoles[0]]?.full_name ?? "there"
      : "team";

  const subject = `${trigger.heading} — ${objectRow.wricef_id ?? objectRow.title} (${project.name})`;

  try {
    const sendResult = await getResendClient().emails.send({
      from: EMAIL_FROM,
      to: toEmails,
      cc: ccSet.size ? Array.from(ccSet) : undefined,
      subject,
      react: ObjectStatusEmail({
        recipientName,
        heading: trigger.heading,
        message: trigger.message,
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

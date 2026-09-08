import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient, EMAIL_FROM } from "@/lib/email/resend";
import ObjectStatusEmail from "@/emails/object-status-email";
import { FALLBACK_STATUS_HEX } from "@/emails/components/shell-v2";
import type { AssignedRole, ObjectRow } from "@/lib/types/database";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

type Admin = ReturnType<typeof createAdminClient>;

type Contact = { full_name: string; email: string; email_notifications_enabled: boolean };

type AssigneeRow = {
  assigned_role: AssignedRole;
  resource: Contact | null;
};

async function logEmail(
  admin: Admin,
  toEmail: string,
  subject: string,
  projectId: string,
  sendResult: { data?: { id?: string } | null; error?: { message: string } | null },
) {
  await admin.from("email_log").insert({
    type: "status_change",
    to_email: toEmail,
    subject,
    project_id: projectId,
    status: sendResult.error ? "failed" : "sent",
    provider_id: sendResult.data?.id ?? null,
    error: sendResult.error?.message ?? null,
  });
}

async function logEmailFailure(admin: Admin, toEmail: string, subject: string, projectId: string, err: unknown) {
  await admin.from("email_log").insert({
    type: "status_change",
    to_email: toEmail,
    subject,
    project_id: projectId,
    status: "failed",
    error: err instanceof Error ? err.message : "Unknown error",
  });
}

/** Shared by both notify entry points below: gated entirely by
 * admin-configured data rather than a hard-coded list of statuses —
 * Settings → Object statuses has an "Email" checkbox per status
 * (picklists.notify_email); if the object's current status doesn't have it
 * checked, this returns null and callers no-op silently.
 *
 * CC'd on everything sent using this context: the project's own PM
 * (projects.pm_id) always, plus whoever's configured in Settings → this
 * project's "Object status emails" list (0048) — both resolved straight
 * from the resource roster, no login required. */
async function getObjectNotificationContext(admin: Admin, objectId: string, projectId: string) {
  const [{ data: object }, { data: project }] = await Promise.all([
    admin.from("objects").select("*").eq("id", objectId).maybeSingle(),
    admin.from("projects").select("id, name, org_id, pm_id").eq("id", projectId).maybeSingle(),
  ]);
  if (!object || !project) return null;
  const objectRow = object as ObjectRow;
  const status = objectRow.status;

  const [{ data: statusPicklist }, { data: orgStatuses }] = await Promise.all([
    admin
      .from("picklists")
      .select("notify_email, color")
      .eq("org_id", project.org_id)
      .eq("type", "status")
      .eq("value", status)
      .eq("is_active", true)
      .maybeSingle(),
    admin
      .from("picklists")
      .select("value")
      .eq("org_id", project.org_id)
      .eq("type", "status")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (!statusPicklist?.notify_email) return null;

  const statusColor = statusPicklist.color ?? FALLBACK_STATUS_HEX;
  const pipelineStatuses = ((orgStatuses ?? []) as { value: string }[]).map((s) => s.value);

  const [{ data: assignments }, { data: pmResource }, { data: extraRecipients }] = await Promise.all([
    admin
      .from("object_assignments")
      .select("assigned_role, resource:resources(full_name, email, email_notifications_enabled)")
      .eq("object_id", objectId),
    project.pm_id
      ? admin.from("resources").select("email, email_notifications_enabled").eq("id", project.pm_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin
      .from("object_status_email_recipients")
      .select("resource:resources(email, email_notifications_enabled)")
      .eq("project_id", projectId),
  ]);

  const rows = (assignments ?? []) as unknown as AssigneeRow[];
  const developer = rows.find((a) => a.assigned_role === "developer")?.resource ?? null;
  const functional = rows.find((a) => a.assigned_role === "functional")?.resource ?? null;

  const ccSet = new Set<string>();
  if (pmResource?.email && pmResource.email_notifications_enabled !== false) ccSet.add(pmResource.email);
  for (const r of (extraRecipients ?? []) as unknown as { resource: Contact | null }[]) {
    if (r.resource?.email && r.resource.email_notifications_enabled !== false) ccSet.add(r.resource.email);
  }

  return { objectRow, project, status, statusColor, pipelineStatuses, developer, functional, ccSet };
}

type Ctx = NonNullable<Awaited<ReturnType<typeof getObjectNotificationContext>>>;

/** Sends one object-status email to one recipient, CC'ing the shared
 * ccSet (minus the recipient themselves). Never throws — logs failures
 * instead, same as every other notify-* helper in this app. */
async function sendOne(
  admin: Admin,
  ctx: Ctx,
  to: Contact,
  opts: { heading: string; message: string; previousStatus: string | null },
) {
  const cc = new Set(ctx.ccSet);
  cc.delete(to.email);

  const subject = `${opts.heading} — ${ctx.objectRow.wricef_id ?? ctx.objectRow.title} (${ctx.project.name})`;
  try {
    const result = await getResendClient().emails.send({
      from: EMAIL_FROM,
      to: [to.email],
      cc: cc.size ? Array.from(cc) : undefined,
      subject,
      react: ObjectStatusEmail({
        recipientName: to.full_name,
        heading: opts.heading,
        message: opts.message,
        objectTitle: ctx.objectRow.title,
        wricefId: ctx.objectRow.wricef_id,
        projectName: ctx.project.name,
        status: ctx.status,
        previousStatus: opts.previousStatus,
        statusColor: ctx.statusColor,
        pipelineStatuses: ctx.pipelineStatuses,
        dueDate: ctx.objectRow.due_date,
        technicalName: ctx.developer?.full_name ?? null,
        functionalName: ctx.functional?.full_name ?? null,
        appUrl: APP_URL,
      }),
    });
    await logEmail(admin, to.email, subject, ctx.project.id, result);
  } catch (err) {
    await logEmailFailure(admin, to.email, subject, ctx.project.id, err);
  }
}

/** Fires when an object's status changes — called from
 * updateObjectByManager/memberUpdateObject. Both assigned consultants get
 * the same status-update email, since a status move is equally relevant to
 * both. See getObjectNotificationContext for the gating/CC rules. */
export async function notifyObjectStatusChange(
  objectId: string,
  projectId: string,
  newStatus: string,
  previousStatus: string | null,
) {
  if (!process.env.RESEND_API_KEY) return;
  const admin = createAdminClient();

  const ctx = await getObjectNotificationContext(admin, objectId, projectId);
  if (!ctx) return;

  const heading = `Now in ${newStatus}`;
  const message = `This object has moved to ${newStatus}.`;

  const recipients = [ctx.developer, ctx.functional].filter(
    (r): r is Contact => !!r && r.email_notifications_enabled !== false,
  );
  const seen = new Set<string>();
  for (const r of recipients) {
    if (seen.has(r.email)) continue;
    seen.add(r.email);
    await sendOne(admin, ctx, r, { heading, message, previousStatus });
  }
}

/** Fires when the functional or technical consultant on an object changes
 * (setObjectAssignee) — deliberately two different emails, not one shared
 * one: the newly assigned technical consultant gets an actionable "start
 * working" email, while the functional consultant (if any) gets a lighter
 * FYI naming who's now on development. Assigning the functional consultant
 * only notifies them directly — the technical side doesn't need an FYI for
 * that. See getObjectNotificationContext for the gating/CC rules. */
export async function notifyObjectAssigneeChange(objectId: string, projectId: string, role: AssignedRole) {
  if (!process.env.RESEND_API_KEY) return;
  const admin = createAdminClient();

  const ctx = await getObjectNotificationContext(admin, objectId, projectId);
  if (!ctx) return;

  if (role === "developer") {
    if (ctx.developer && ctx.developer.email_notifications_enabled !== false) {
      await sendOne(admin, ctx, ctx.developer, {
        heading: "You've been assigned",
        message: "This object has been assigned to you as the technical consultant — you can start working on it.",
        previousStatus: null,
      });
    }
    if (
      ctx.functional &&
      ctx.functional.email_notifications_enabled !== false &&
      ctx.functional.email !== ctx.developer?.email
    ) {
      await sendOne(admin, ctx, ctx.functional, {
        heading: "Technical consultant assigned",
        message: `This object has been assigned to ${ctx.developer?.full_name ?? "a technical consultant"} to start development.`,
        previousStatus: null,
      });
    }
  } else {
    if (ctx.functional && ctx.functional.email_notifications_enabled !== false) {
      await sendOne(admin, ctx, ctx.functional, {
        heading: "You've been assigned",
        message: "This object has been assigned to you as the functional consultant.",
        previousStatus: null,
      });
    }
  }
}

import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient, EMAIL_FROM } from "@/lib/email/resend";
import ObjectStatusEmail from "@/emails/object-status-email";
import { FALLBACK_STATUS_HEX } from "@/emails/components/shell-v2";
import type { AssignedRole, ObjectRow } from "@/lib/types/database";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

type Admin = ReturnType<typeof createAdminClient>;

type Contact = { full_name: string; email: string; email_notifications_enabled: boolean };

type AssigneeRow = {
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

  // Developer and functional are fetched as two independent targeted
  // queries rather than one query filtered client-side -- each assigned
  // role must resolve on its own so a data quirk on one role's row (or a
  // dedup mistake) can never silently drop the other consultant's email.
  const [{ data: developerRow }, { data: functionalRow }, { data: pmResource }, { data: extraRecipients }] =
    await Promise.all([
      admin
        .from("object_assignments")
        .select("resource:resources(full_name, email, email_notifications_enabled)")
        .eq("object_id", objectId)
        .eq("assigned_role", "developer")
        .maybeSingle(),
      admin
        .from("object_assignments")
        .select("resource:resources(full_name, email, email_notifications_enabled)")
        .eq("object_id", objectId)
        .eq("assigned_role", "functional")
        .maybeSingle(),
      project.pm_id
        ? admin.from("resources").select("email, email_notifications_enabled").eq("id", project.pm_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .from("object_status_email_recipients")
        .select("resource:resources(email, email_notifications_enabled)")
        .eq("project_id", projectId),
    ]);

  const developer = (developerRow as unknown as AssigneeRow | null)?.resource ?? null;
  const functional = (functionalRow as unknown as AssigneeRow | null)?.resource ?? null;

  const ccSet = new Set<string>();
  if (pmResource?.email && pmResource.email_notifications_enabled !== false) ccSet.add(pmResource.email);
  for (const r of (extraRecipients ?? []) as unknown as { resource: Contact | null }[]) {
    if (r.resource?.email && r.resource.email_notifications_enabled !== false) ccSet.add(r.resource.email);
  }

  return { objectRow, project, status, statusColor, pipelineStatuses, developer, functional, ccSet };
}

type Ctx = NonNullable<Awaited<ReturnType<typeof getObjectNotificationContext>>>;

/** Resolves the project's active Technical Lead(s) — same resource-
 * preferred email resolution as notify-ticket.ts's getProjectEditorEmails
 * (a roster entry's own email is freely editable, unlike the login email,
 * which locks in at invite time). The project's PM is resolved separately
 * via projects.pm_id (getObjectNotificationContext), so this is scoped to
 * technical_lead only. */
async function getTechnicalLeadEmails(admin: Admin, projectId: string): Promise<string[]> {
  const { data: members } = await admin
    .from("project_members")
    .select("profile_id, profile:profiles(email)")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .eq("role", "technical_lead");

  const rows = (members ?? []) as unknown as { profile_id: string; profile: { email: string } | null }[];
  const profileIds = rows.map((r) => r.profile_id).filter(Boolean);

  const { data: resourceRows } = profileIds.length
    ? await admin.from("resources").select("profile_id, email").in("profile_id", profileIds)
    : { data: [] as { profile_id: string; email: string }[] };
  const resourceEmailByProfile = new Map((resourceRows ?? []).map((r) => [r.profile_id, r.email]));

  return Array.from(
    new Set(rows.map((r) => resourceEmailByProfile.get(r.profile_id) || r.profile?.email).filter((e): e is string => !!e)),
  );
}

/** Sends one object-status email to one recipient, CC'ing the shared
 * ccSet plus any extraCc (minus the recipient themselves). Never throws —
 * logs failures instead, same as every other notify-* helper in this app. */
async function sendOne(
  admin: Admin,
  ctx: Ctx,
  to: Contact,
  opts: { heading: string; message: string; previousStatus: string | null; extraCc?: string[] },
) {
  const cc = new Set(ctx.ccSet);
  for (const email of opts.extraCc ?? []) cc.add(email);
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
 * working" email naming the functional consultant to contact for
 * clarifications, while the functional consultant (if any) gets a lighter
 * FYI naming who's now on development. Assigning the functional consultant
 * only notifies them directly — the technical side doesn't need an FYI for
 * that. Both emails additionally CC the project's Technical Lead(s)
 * (the PM is already CC'd via getObjectNotificationContext's ccSet). See
 * getObjectNotificationContext for the gating/base-CC rules. */
export async function notifyObjectAssigneeChange(objectId: string, projectId: string, role: AssignedRole) {
  if (!process.env.RESEND_API_KEY) return;
  const admin = createAdminClient();

  const ctx = await getObjectNotificationContext(admin, objectId, projectId);
  if (!ctx) return;

  const technicalLeadEmails = await getTechnicalLeadEmails(admin, projectId);

  // The functional consultant is treated as the object's business owner
  // throughout this app, so both paths that reach them (a technical
  // consultant landing on their object, or their own assignment before one
  // has) use the same reassuring, professional framing: a named technical
  // consultant is on it (or will be), the functional consultant can reach
  // out to them directly, and status updates will follow automatically.
  const technicalAssignedMessage = ctx.developer
    ? `This object has been assigned to ${ctx.developer.full_name} as the technical consultant. Should you have any clarifications, please feel free to reach out to them directly, and you will be notified of any status updates on this object.`
    : "This object has been registered under your ownership as the functional consultant. Once a technical consultant is assigned, you will be able to reach out to them directly for any clarifications, and you will be notified of any status updates on this object.";

  const developerAssignedMessage = ctx.functional
    ? `An object has been assigned to you as the technical consultant. Should you have any clarifications regarding requirements, please reach out to the functional consultant, ${ctx.functional.full_name}.`
    : "An object has been assigned to you as the technical consultant. Should you have any clarifications regarding requirements, please reach out to the project's functional consultant.";

  if (role === "developer") {
    if (ctx.developer && ctx.developer.email_notifications_enabled !== false) {
      await sendOne(admin, ctx, ctx.developer, {
        heading: "You've been assigned",
        message: developerAssignedMessage,
        previousStatus: null,
        extraCc: technicalLeadEmails,
      });
    }
    if (
      ctx.functional &&
      ctx.functional.email_notifications_enabled !== false &&
      ctx.functional.email !== ctx.developer?.email
    ) {
      await sendOne(admin, ctx, ctx.functional, {
        heading: "Technical consultant assigned",
        message: technicalAssignedMessage,
        previousStatus: null,
        extraCc: technicalLeadEmails,
      });
    }
  } else {
    if (ctx.functional && ctx.functional.email_notifications_enabled !== false) {
      await sendOne(admin, ctx, ctx.functional, {
        heading: ctx.developer ? "Technical consultant assigned" : "You've been assigned",
        message: technicalAssignedMessage,
        previousStatus: null,
        extraCc: technicalLeadEmails,
      });
    }
  }
}

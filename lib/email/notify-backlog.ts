import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient, EMAIL_FROM } from "@/lib/email/resend";
import BacklogApprovalEmail, { type BacklogApprovalItem } from "@/emails/backlog-approval-email";
import type { BacklogItem, EmailType } from "@/lib/types/database";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

type Admin = ReturnType<typeof createAdminClient>;

async function logEmail(
  admin: Admin,
  type: EmailType,
  toEmail: string,
  subject: string,
  projectId: string,
  sendResult: { data?: { id?: string } | null; error?: { message: string } | null },
) {
  await admin.from("email_log").insert({
    type,
    to_email: toEmail,
    subject,
    project_id: projectId,
    status: sendResult.error ? "failed" : "sent",
    provider_id: sendResult.data?.id ?? null,
    error: sendResult.error?.message ?? null,
  });
}

async function logEmailFailure(admin: Admin, type: EmailType, toEmail: string, subject: string, projectId: string, err: unknown) {
  await admin.from("email_log").insert({
    type,
    to_email: toEmail,
    subject,
    project_id: projectId,
    status: "failed",
    error: err instanceof Error ? err.message : "Unknown error",
  });
}

/** Client recipients are project_members with role='client', same join
 * lib/jobs/weekly-digest.ts already uses -- no separate "client contact"
 * concept invented here. */
async function getClientRecipients(admin: Admin, projectId: string) {
  const { data } = await admin
    .from("project_members")
    .select("profile:profiles(full_name, email)")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .eq("role", "client");

  return ((data ?? []) as unknown as Array<{ profile: { full_name: string; email: string } | null }>)
    .filter((r): r is { profile: { full_name: string; email: string } } => !!r.profile)
    .map((r) => ({ email: r.profile.email, fullName: r.profile.full_name }));
}

function toEmailItems(items: BacklogItem[]): BacklogApprovalItem[] {
  return items.map((item) => ({
    itemNo: item.item_no ?? "—",
    companyCode: item.company_code,
    module: item.module,
    devType: item.dev_type,
    description: item.description,
    complexity: item.complexity,
    devDays: item.dev_days,
    funcDays: item.func_days,
    fioriDays: item.fiori_days,
  }));
}

/** Fires from sendToClient() -- the client-facing approval/summary email
 * (unchanged from the original design), now a deliberate second step
 * after internal PM approval rather than the trigger for it. One email
 * per client recipient, gated on notification_settings.backlog_emails_enabled. */
export async function notifyBacklogApprovalRequest(
  projectId: string,
  itemIds: string[],
  crNo: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY || itemIds.length === 0) return;
  const admin = createAdminClient();

  const { data: settings } = await admin
    .from("notification_settings")
    .select("backlog_emails_enabled")
    .eq("project_id", projectId)
    .maybeSingle();
  if (settings && settings.backlog_emails_enabled === false) return;

  const { data: project } = await admin.from("projects").select("id, name").eq("id", projectId).maybeSingle();
  if (!project) return;

  const { data: itemRows } = await admin.from("backlog_items").select("*").in("id", itemIds);
  const items = (itemRows ?? []) as BacklogItem[];
  if (items.length === 0) return;

  const emailItems = toEmailItems(items);
  const totalDays = emailItems.reduce((sum, i) => sum + i.devDays + i.funcDays + i.fioriDays, 0);

  const recipients = await getClientRecipients(admin, projectId);
  if (recipients.length === 0) return;

  const subject = `${project.name} — Backlog approval request (${crNo}) — ${items.length} item${items.length === 1 ? "" : "s"}`;

  for (const recipient of recipients) {
    try {
      const result = await getResendClient().emails.send({
        from: EMAIL_FROM,
        to: [recipient.email],
        subject,
        react: BacklogApprovalEmail({
          recipientName: recipient.fullName,
          projectName: project.name,
          crNo,
          items: emailItems,
          totalDays,
          appUrl: APP_URL,
        }),
      });
      await logEmail(admin, "backlog_approval_request", recipient.email, subject, projectId, result);
    } catch (err) {
      await logEmailFailure(admin, "backlog_approval_request", recipient.email, subject, projectId, err);
    }
  }
}

/** Fires from sendForApproval() right after the selected items flip to
 * 'sent_for_approval' -- the *internal* PM-approval step. Notifies the
 * project's configured backlog_approver_id, falling back to the project's
 * pm_id resource if unset (same fallback lib/data/backlog.ts::
 * getBacklogApprover uses, re-resolved here directly against the admin
 * client since this module never touches the request-scoped session
 * client). One email, listing the batch's items -- reuses the same
 * template as the client email since its copy is already generic
 * ("awaiting your approval"). No-op (silently) if no approver and no PM
 * are configured -- the item still moves to sent_for_approval either way,
 * it just won't have anyone notified until Settings -> Backlog is set. */
export async function notifyBacklogPmApprovalRequest(
  projectId: string,
  itemIds: string[],
  batchRef: string | null,
): Promise<void> {
  if (!process.env.RESEND_API_KEY || itemIds.length === 0) return;
  const admin = createAdminClient();

  const { data: settings } = await admin
    .from("notification_settings")
    .select("backlog_emails_enabled")
    .eq("project_id", projectId)
    .maybeSingle();
  if (settings && settings.backlog_emails_enabled === false) return;

  const { data: project } = await admin
    .from("projects")
    .select("id, name, backlog_approver_id, pm_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return;

  const approverResourceId = project.backlog_approver_id ?? project.pm_id;
  if (!approverResourceId) return;

  const { data: approver } = await admin
    .from("resources")
    .select("full_name, email")
    .eq("id", approverResourceId)
    .maybeSingle();
  if (!approver?.email) return;

  const { data: itemRows } = await admin.from("backlog_items").select("*").in("id", itemIds);
  const items = (itemRows ?? []) as BacklogItem[];
  if (items.length === 0) return;

  const emailItems = toEmailItems(items);
  const totalDays = emailItems.reduce((sum, i) => sum + i.devDays + i.funcDays + i.fioriDays, 0);
  const ref = batchRef ?? "—";

  const subject = `${project.name} — Backlog approval needed (${ref}) — ${items.length} item${items.length === 1 ? "" : "s"}`;

  try {
    const result = await getResendClient().emails.send({
      from: EMAIL_FROM,
      to: [approver.email],
      subject,
      react: BacklogApprovalEmail({
        recipientName: approver.full_name,
        projectName: project.name,
        crNo: ref,
        items: emailItems,
        totalDays,
        appUrl: APP_URL,
      }),
    });
    await logEmail(admin, "backlog_pm_approval_request", approver.email, subject, projectId, result);
  } catch (err) {
    await logEmailFailure(admin, "backlog_pm_approval_request", approver.email, subject, projectId, err);
  }
}

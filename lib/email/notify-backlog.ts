import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient, EMAIL_FROM } from "@/lib/email/resend";
import BacklogApprovalEmail, { type BacklogApprovalItem } from "@/emails/backlog-approval-email";
import type { BacklogItem } from "@/lib/types/database";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

type Admin = ReturnType<typeof createAdminClient>;

async function logEmail(
  admin: Admin,
  toEmail: string,
  subject: string,
  projectId: string,
  sendResult: { data?: { id?: string } | null; error?: { message: string } | null },
) {
  await admin.from("email_log").insert({
    type: "backlog_approval_request",
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
    type: "backlog_approval_request",
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

/** Fires from sendForApproval() right after the selected items flip to
 * 'sent_for_approval' -- event-driven, mirroring notifyTicketCreated().
 * One email per client recipient, each listing every selected item's
 * Dev/Functional/Fiori effort in days plus batch totals (no cost figures
 * -- this feature is effort-in-days only), gated on
 * notification_settings.backlog_emails_enabled. */
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

  const emailItems: BacklogApprovalItem[] = items.map((item) => ({
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
      await logEmail(admin, recipient.email, subject, projectId, result);
    } catch (err) {
      await logEmailFailure(admin, recipient.email, subject, projectId, err);
    }
  }
}

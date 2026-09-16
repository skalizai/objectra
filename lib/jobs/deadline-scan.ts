import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient, EMAIL_FROM } from "@/lib/email/resend";
import { DEVELOPMENT_STATUS } from "@/lib/object-meta";
import DeadlineAlertEmail from "@/emails/deadline-alert-email";
import type { ObjectRow, Project } from "@/lib/types/database";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function daysRemaining(dueDate: string) {
  const due = new Date(dueDate);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86400000);
}

export interface DeadlineScanResult {
  projectsScanned: number;
  emailsSent: number;
  emailsFailed: number;
  emailsSkipped: number;
}

type ResourceContact = { id: string; full_name: string; email: string; email_notifications_enabled: boolean };

/** Daily job (section 7): for every active project with deadline alerts
 * enabled, finds non-live objects that are overdue or due within
 * deadline_lead_days, and sends one grouped email per project to that
 * project's Technical Lead (CC the PM) — both resolved from the resource
 * roster (projects.technical_lead_id / pm_id, migration 0050 / 0016), not
 * project_members roles, so this doesn't depend on anyone having accepted
 * an invite. Falls back to the PM as the sole recipient when there's no
 * Technical Lead set. Idempotent — a recipient already emailed for a
 * project today is skipped. */
export async function runDeadlineScan(options?: { projectId?: string }): Promise<DeadlineScanResult> {
  const supabase = createAdminClient();
  const result: DeadlineScanResult = { projectsScanned: 0, emailsSent: 0, emailsFailed: 0, emailsSkipped: 0 };

  let projectQuery = supabase.from("projects").select("*").eq("status", "active");
  if (options?.projectId) projectQuery = projectQuery.eq("id", options.projectId);
  const { data: projects } = await projectQuery;

  for (const project of (projects ?? []) as Project[]) {
    const { data: settings } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("project_id", project.id)
      .maybeSingle();

    if (!settings || !settings.deadline_alerts_enabled) continue;
    result.projectsScanned += 1;

    const { data: objects } = await supabase
      .from("objects")
      .select("*")
      .eq("project_id", project.id)
      .not("due_date", "is", null);

    // A due date only marks an object "at risk" while it's actively in
    // Development in Progress — see lib/object-meta.ts.
    const atRisk = ((objects ?? []) as ObjectRow[]).filter((o) => {
      if (o.status !== DEVELOPMENT_STATUS) return false;
      const remaining = daysRemaining(o.due_date!);
      return remaining < 0 || remaining <= settings.deadline_lead_days;
    });
    if (atRisk.length === 0) continue;

    const [{ data: techLeadResource }, { data: pmResource }] = await Promise.all([
      project.technical_lead_id
        ? supabase
            .from("resources")
            .select("id, full_name, email, email_notifications_enabled")
            .eq("id", project.technical_lead_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      project.pm_id
        ? supabase
            .from("resources")
            .select("id, full_name, email, email_notifications_enabled")
            .eq("id", project.pm_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const techLead = techLeadResource as ResourceContact | null;
    const pm = pmResource as ResourceContact | null;

    // Technical Lead is the primary recipient, PM in CC; if there's no
    // Technical Lead set for the project, the PM gets it directly instead.
    const primary = techLead && techLead.email_notifications_enabled !== false ? techLead : null;
    const fallback = !primary && pm && pm.email_notifications_enabled !== false ? pm : null;
    const recipient = primary ?? fallback;
    if (!recipient) continue;

    const cc =
      primary && pm && pm.id !== primary.id && pm.email_notifications_enabled !== false ? pm.email : undefined;

    const { data: alreadySentToday } = await supabase
      .from("email_log")
      .select("to_email")
      .eq("type", "deadline_alert")
      .eq("project_id", project.id)
      .gte("sent_at", startOfTodayIso());
    const alreadySent = new Set((alreadySentToday ?? []).map((r) => r.to_email));

    if (alreadySent.has(recipient.email)) {
      result.emailsSkipped += 1;
      continue;
    }

    const items = atRisk.map((o) => ({
      title: o.title,
      wricefId: o.wricef_id,
      dueDate: o.due_date!,
      daysRemaining: daysRemaining(o.due_date!),
    }));
    const subject = `Deadline alert — ${project.name}: ${items.length} object${items.length === 1 ? "" : "s"} need attention`;

    try {
      const sendResult = await getResendClient().emails.send({
        from: EMAIL_FROM,
        to: recipient.email,
        cc,
        subject,
        react: DeadlineAlertEmail({
          recipientName: recipient.full_name,
          projectName: project.name,
          items,
          appUrl: APP_URL,
        }),
      });

      await supabase.from("email_log").insert({
        type: "deadline_alert",
        to_email: recipient.email,
        subject,
        project_id: project.id,
        status: sendResult.error ? "failed" : "sent",
        provider_id: sendResult.data?.id ?? null,
        error: sendResult.error?.message ?? null,
      });

      if (sendResult.error) result.emailsFailed += 1;
      else result.emailsSent += 1;
    } catch (err) {
      result.emailsFailed += 1;
      await supabase.from("email_log").insert({
        type: "deadline_alert",
        to_email: recipient.email,
        subject,
        project_id: project.id,
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return result;
}

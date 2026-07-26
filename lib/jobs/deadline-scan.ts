import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient, EMAIL_FROM } from "@/lib/email/resend";
import { isDoneStatus } from "@/lib/object-meta";
import DeadlineAlertEmail from "@/emails/deadline-alert-email";
import type { ObjectRow, Picklist, Project } from "@/lib/types/database";

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

/** Daily job (section 7): for every active project with deadline alerts
 * enabled, finds non-live objects that are overdue or due within
 * deadline_lead_days, and sends one grouped email per recipient (assigned
 * members + the project PM) rather than one email per object. Idempotent —
 * a recipient already emailed for a project today is skipped. */
export async function runDeadlineScan(options?: { projectId?: string }): Promise<DeadlineScanResult> {
  const supabase = createAdminClient();
  const result: DeadlineScanResult = { projectsScanned: 0, emailsSent: 0, emailsFailed: 0, emailsSkipped: 0 };

  let projectQuery = supabase.from("projects").select("*").eq("status", "active");
  if (options?.projectId) projectQuery = projectQuery.eq("id", options.projectId);
  const { data: projects } = await projectQuery;

  const statusCache = new Map<string, Picklist[]>();
  async function getDoneStatuses(orgId: string) {
    if (!statusCache.has(orgId)) {
      const { data } = await supabase.from("picklists").select("*").eq("org_id", orgId).eq("type", "status");
      statusCache.set(orgId, (data ?? []) as Picklist[]);
    }
    return statusCache.get(orgId)!;
  }

  for (const project of (projects ?? []) as Project[]) {
    const { data: settings } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("project_id", project.id)
      .maybeSingle();

    if (!settings || !settings.deadline_alerts_enabled) continue;
    result.projectsScanned += 1;

    const statuses = await getDoneStatuses(project.org_id);
    const { data: objects } = await supabase
      .from("objects")
      .select("*")
      .eq("project_id", project.id)
      .not("due_date", "is", null);

    const atRisk = ((objects ?? []) as ObjectRow[]).filter((o) => {
      if (isDoneStatus(o.status, statuses)) return false;
      const remaining = daysRemaining(o.due_date!);
      return remaining < 0 || remaining <= settings.deadline_lead_days;
    });
    if (atRisk.length === 0) continue;

    const objectIds = atRisk.map((o) => o.id);
    // object_assignments points at resources (migration 0013), not
    // profiles directly — only resources that have actually been invited
    // (profile_id set) have a login to notify.
    const { data: assignments } = await supabase
      .from("object_assignments")
      .select("object_id, resource:resources(profile_id, full_name, email)")
      .in("object_id", objectIds);

    const { data: pmRows } = await supabase
      .from("project_members")
      .select("profile_id")
      .eq("project_id", project.id)
      .in("role", ["project_manager", "technical_lead", "pmo"])
      .eq("is_active", true);

    const itemsByRecipient = new Map<string, ObjectRow[]>();
    for (const a of (assignments ?? []) as unknown as { object_id: string; resource: { profile_id: string | null } | null }[]) {
      const profileId = a.resource?.profile_id;
      if (!profileId) continue;
      const list = itemsByRecipient.get(profileId) ?? [];
      const obj = atRisk.find((o) => o.id === a.object_id);
      if (obj) list.push(obj);
      itemsByRecipient.set(profileId, list);
    }
    for (const pm of pmRows ?? []) {
      itemsByRecipient.set(pm.profile_id, atRisk);
    }

    const recipientIds = Array.from(itemsByRecipient.keys());
    if (recipientIds.length === 0) continue;

    const { data: recipientProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", recipientIds);

    const { data: alreadySentToday } = await supabase
      .from("email_log")
      .select("to_email")
      .eq("type", "deadline_alert")
      .eq("project_id", project.id)
      .gte("sent_at", startOfTodayIso());
    const alreadySent = new Set((alreadySentToday ?? []).map((r) => r.to_email));

    for (const profile of recipientProfiles ?? []) {
      if (alreadySent.has(profile.email)) {
        result.emailsSkipped += 1;
        continue;
      }

      const items = (itemsByRecipient.get(profile.id) ?? []).map((o) => ({
        title: o.title,
        wricefId: o.wricef_id,
        dueDate: o.due_date!,
        daysRemaining: daysRemaining(o.due_date!),
      }));
      const subject = `Deadline alert — ${project.name}: ${items.length} object${items.length === 1 ? "" : "s"} need attention`;

      try {
        const sendResult = await getResendClient().emails.send({
          from: EMAIL_FROM,
          to: profile.email,
          subject,
          react: DeadlineAlertEmail({
            recipientName: profile.full_name,
            projectName: project.name,
            items,
            appUrl: APP_URL,
          }),
        });

        await supabase.from("email_log").insert({
          type: "deadline_alert",
          to_email: profile.email,
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
          to_email: profile.email,
          subject,
          project_id: project.id,
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  }

  return result;
}

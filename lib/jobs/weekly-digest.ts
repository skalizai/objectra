import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient, EMAIL_FROM } from "@/lib/email/resend";
import { isDoneStatus, isOverdue } from "@/lib/object-meta";
import WeeklyDigestEmail, { type DigestObjectItem } from "@/emails/weekly-digest-email";
import type { DigestDay, ObjectRow, Picklist, Project } from "@/lib/types/database";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const DAY_KEYS: DigestDay[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Functional/technical consultant names for a batch of objects, so the
 * digest can show who's on each one — management-readable, not just a
 * WRICEF ID nobody outside the delivery team recognizes. */
async function getAssigneeNames(
  supabase: ReturnType<typeof createAdminClient>,
  objectIds: string[],
): Promise<Map<string, { functional?: string; technical?: string }>> {
  const map = new Map<string, { functional?: string; technical?: string }>();
  if (objectIds.length === 0) return map;

  const { data } = await supabase
    .from("object_assignments")
    .select("object_id, assigned_role, resource:resources(full_name)")
    .in("object_id", objectIds);

  for (const row of (data ?? []) as unknown as {
    object_id: string;
    assigned_role: string;
    resource: { full_name: string } | null;
  }[]) {
    const entry = map.get(row.object_id) ?? {};
    if (row.assigned_role === "functional") entry.functional = row.resource?.full_name;
    if (row.assigned_role === "developer") entry.technical = row.resource?.full_name;
    map.set(row.object_id, entry);
  }
  return map;
}

function toDigestItem(
  o: ObjectRow,
  assigneeMap: Map<string, { functional?: string; technical?: string }>,
): DigestObjectItem {
  const a = assigneeMap.get(o.id);
  return {
    title: o.title,
    module: o.module,
    status: o.status,
    functionalName: a?.functional ?? null,
    technicalName: a?.technical ?? null,
    dueDate: null,
  };
}

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function sevenDaysAgoIso() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

export interface WeeklyDigestResult {
  projectsScanned: number;
  emailsSent: number;
  emailsFailed: number;
  emailsSkipped: number;
}

/** Weekly job (section 7): per project, sends PMs and clients the same
 * summary the dashboard shows plus what changed this week. `force` bypasses
 * both the digest_day check and today's dedupe, for the manual "send test
 * digest" button in project settings. */
export async function runWeeklyDigest(options?: {
  projectId?: string;
  force?: boolean;
}): Promise<WeeklyDigestResult> {
  const supabase = createAdminClient();
  const result: WeeklyDigestResult = { projectsScanned: 0, emailsSent: 0, emailsFailed: 0, emailsSkipped: 0 };

  const todayKey = DAY_KEYS[new Date().getDay()];

  let projectQuery = supabase.from("projects").select("*").eq("status", "active");
  if (options?.projectId) projectQuery = projectQuery.eq("id", options.projectId);
  const { data: projects } = await projectQuery;

  const statusCache = new Map<string, Picklist[]>();
  async function getStatuses(orgId: string) {
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

    if (!settings || !settings.weekly_digest_enabled) continue;
    if (!options?.force && settings.digest_day !== todayKey) continue;
    result.projectsScanned += 1;

    const statuses = await getStatuses(project.org_id);
    const { data: objects } = await supabase.from("objects").select("*").eq("project_id", project.id);
    const allObjects = (objects ?? []) as ObjectRow[];

    // Settings → Notifications → "Statuses to include" scopes the whole
    // digest (totals, moved-this-week, overdue) to a subset of the
    // pipeline — empty means every status, unchanged from before this
    // setting existed.
    const digestStatuses = (settings.digest_statuses ?? []) as string[];
    const objectList =
      digestStatuses.length > 0 ? allObjects.filter((o) => digestStatuses.includes(o.status)) : allObjects;

    const live = objectList.filter((o) => isDoneStatus(o.status, statuses)).length;
    const atRisk = objectList.filter((o) => isOverdue(o.due_date, o.status));
    const total = objectList.length;

    const { data: recentAudit } = await supabase
      .from("audit_log")
      .select("object_id, changed_at")
      .eq("field", "status")
      .gte("changed_at", sevenDaysAgoIso())
      .in(
        "object_id",
        objectList.map((o) => o.id),
      )
      .order("changed_at", { ascending: false });

    // Dedupe to one entry per object (its current status), most recently
    // changed first — an object that moved twice this week only needs to
    // show up once, with where it actually stands now.
    const objectById = new Map(objectList.map((o) => [o.id, o]));
    const seenMoved = new Set<string>();
    const movedObjects: ObjectRow[] = [];
    for (const row of (recentAudit ?? []) as { object_id: string }[]) {
      if (seenMoved.has(row.object_id)) continue;
      seenMoved.add(row.object_id);
      const obj = objectById.get(row.object_id);
      if (obj) movedObjects.push(obj);
      if (movedObjects.length >= 10) break;
    }

    const assigneeMap = await getAssigneeNames(
      supabase,
      Array.from(new Set([...movedObjects.map((o) => o.id), ...atRisk.slice(0, 10).map((o) => o.id)])),
    );

    const movedThisWeek = movedObjects.map((o) => toDigestItem(o, assigneeMap));

    const { data: memberRows } = await supabase
      .from("project_members")
      .select("role, profile:profiles(full_name, email)")
      .eq("project_id", project.id)
      .eq("is_active", true)
      .in(
        "role",
        [
          // "pms" covers the rest of the delivery team, not just PMs —
          // Technical Lead and regular Members. PMO is its own toggle.
          ...(settings.digest_recipients?.pms !== false ? ["project_manager", "technical_lead", "member"] : []),
          ...(settings.digest_recipients?.pmo !== false ? ["pmo"] : []),
          ...(settings.digest_recipients?.clients !== false ? ["client"] : []),
        ],
      );

    const memberRecipients = ((memberRows ?? []) as unknown as Array<{
      profile: { full_name: string; email: string } | null;
    }>)
      .filter((r): r is { profile: { full_name: string; email: string } } => !!r.profile)
      .map((r) => ({ email: r.profile.email, fullName: r.profile.full_name }));

    // Admin-added client addresses (Settings → Notifications → Clients →
    // Client email addresses) — external stakeholders with no login, so no
    // name to greet them by. Only included while Clients is checked, same
    // as clients with an actual login.
    const extraRecipients =
      settings.digest_recipients?.clients !== false
        ? ((settings.extra_digest_emails ?? []) as string[]).map((email) => ({ email, fullName: "there" }))
        : [];

    // Dedupe by email — someone could plausibly be both a project member
    // and (redundantly) listed in the extra addresses.
    const recipientsByEmail = new Map<string, { email: string; fullName: string }>();
    for (const r of [...memberRecipients, ...extraRecipients]) {
      if (!recipientsByEmail.has(r.email)) recipientsByEmail.set(r.email, r);
    }
    const allRecipients = Array.from(recipientsByEmail.values());
    if (allRecipients.length === 0) continue;

    const { data: alreadySentToday } = options?.force
      ? { data: [] }
      : await supabase
          .from("email_log")
          .select("to_email")
          .eq("type", "weekly_digest")
          .eq("project_id", project.id)
          .gte("sent_at", startOfTodayIso());
    const alreadySent = new Set((alreadySentToday ?? []).map((r) => r.to_email));

    const percentComplete = total === 0 ? 0 : Math.round((live / total) * 100);
    const subject = `Weekly status — ${project.name}: ${percentComplete}% complete`;

    for (const recipient of allRecipients) {
      if (alreadySent.has(recipient.email)) {
        result.emailsSkipped += 1;
        continue;
      }

      try {
        const sendResult = await getResendClient().emails.send({
          from: EMAIL_FROM,
          to: recipient.email,
          subject,
          react: WeeklyDigestEmail({
            recipientName: recipient.fullName,
            projectName: project.name,
            total,
            live,
            inFlight: total - live - atRisk.length,
            atRisk: atRisk.length,
            percentComplete,
            movedThisWeek,
            overdue: atRisk.slice(0, 10).map((o) => ({ ...toDigestItem(o, assigneeMap), dueDate: o.due_date })),
            appUrl: APP_URL,
          }),
        });

        await supabase.from("email_log").insert({
          type: "weekly_digest",
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
          type: "weekly_digest",
          to_email: recipient.email,
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

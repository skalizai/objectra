import { createClient } from "@/lib/supabase/server";
import type {
  SlaPolicy,
  SupportRouting,
  SupportSummary,
  Ticket,
  TicketComment,
  TicketEvent,
} from "@/lib/types/database";

export interface TicketWithNames extends Ticket {
  raised_by_name: string | null;
  assigned_to_name: string | null;
  project_name: string;
}

async function withNames(supabase: Awaited<ReturnType<typeof createClient>>, tickets: Ticket[]) {
  if (tickets.length === 0) return [] as TicketWithNames[];

  const profileIds = Array.from(
    new Set(tickets.flatMap((t) => [t.raised_by, t.assigned_to]).filter((v): v is string => !!v)),
  );
  const projectIds = Array.from(new Set(tickets.map((t) => t.project_id)));

  const [{ data: profiles }, { data: projects }] = await Promise.all([
    profileIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    supabase.from("projects").select("id, name").in("id", projectIds),
  ]);

  const nameByProfile = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const nameByProject = new Map((projects ?? []).map((p) => [p.id, p.name]));

  return tickets.map((t) => ({
    ...t,
    raised_by_name: t.raised_by ? (nameByProfile.get(t.raised_by) ?? null) : null,
    assigned_to_name: t.assigned_to ? (nameByProfile.get(t.assigned_to) ?? null) : null,
    project_name: nameByProject.get(t.project_id) ?? "—",
  }));
}

/** RLS (tickets_select) scopes this to every ticket on the project for a
 * project editor/org_admin — used by the Support dashboard table. */
export async function getProjectTickets(projectId: string): Promise<TicketWithNames[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return withNames(supabase, (data ?? []) as Ticket[]);
}

/** RLS scopes this to tickets assigned to the caller, or (for a super
 * user) raised by them — no manual filtering needed, same pattern as
 * getMyWork(). Used by "My tickets" on /my-work and the super user's
 * /my-tickets home page. */
export async function getMyTickets(): Promise<TicketWithNames[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select("*")
    .order("sla_due_at", { ascending: true, nullsFirst: false });

  return withNames(supabase, (data ?? []) as Ticket[]);
}

export async function getTicketById(ticketId: string): Promise<TicketWithNames | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("tickets").select("*").eq("id", ticketId).maybeSingle();
  if (!data) return null;
  const [withName] = await withNames(supabase, [data as Ticket]);
  return withName;
}

export interface TicketCommentWithAuthor extends TicketComment {
  author_name: string | null;
}

export async function getTicketComments(ticketId: string): Promise<TicketCommentWithAuthor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ticket_comments")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  const comments = (data ?? []) as TicketComment[];
  if (comments.length === 0) return [];

  const authorIds = Array.from(new Set(comments.map((c) => c.author_id).filter((v): v is string => !!v)));
  const { data: profiles } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return comments.map((c) => ({ ...c, author_name: c.author_id ? (nameById.get(c.author_id) ?? null) : null }));
}

export interface TicketEventWithActor extends TicketEvent {
  actor_name: string | null;
}

export async function getTicketEvents(ticketId: string): Promise<TicketEventWithActor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ticket_events")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("occurred_at", { ascending: true });

  const events = (data ?? []) as TicketEvent[];
  if (events.length === 0) return [];

  const actorIds = Array.from(new Set(events.map((e) => e.actor_id).filter((v): v is string => !!v)));
  const { data: profiles } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return events.map((e) => ({ ...e, actor_name: e.actor_id ? (nameById.get(e.actor_id) ?? null) : null }));
}

export async function getSupportRouting(projectId: string): Promise<SupportRouting[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("support_routing")
    .select("*")
    .eq("project_id", projectId)
    .order("module", { ascending: true });
  return (data ?? []) as SupportRouting[];
}

export async function getSlaPolicies(projectId: string): Promise<SlaPolicy[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sla_policies")
    .select("*")
    .eq("project_id", projectId)
    .order("criticality", { ascending: true });
  return (data ?? []) as SlaPolicy[];
}

export interface SupportDashboardData {
  kpis: {
    open: number;
    unrouted: number;
    breachingSla: number;
    resolvedThisWeek: number;
    avgFirstResponseHrs: number | null;
    avgResolutionHrs: number | null;
  };
  statusDistribution: { status: string; count: number }[];
  byCriticality: { criticality: string; count: number }[];
  agingBuckets: { bucket: string; count: number }[];
}

/** Aggregates the Support dashboard's KPI tiles, status donut, criticality
 * bar, and aging buckets from the same RLS-scoped ticket set the table
 * uses — no separate access check needed. */
export async function getSupportDashboardData(projectId: string): Promise<SupportDashboardData> {
  const supabase = await createClient();
  const { data } = await supabase.from("tickets").select("*").eq("project_id", projectId);
  const tickets = (data ?? []) as import("@/lib/types/database").Ticket[];

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const open = tickets.filter((t) => !["resolved", "closed"].includes(t.status));
  const unrouted = tickets.filter((t) => t.status === "new").length;
  const breachingSla = open.filter((t) => t.sla_breached).length;
  const resolvedThisWeek = tickets.filter((t) => t.resolved_at && t.resolved_at >= sevenDaysAgo).length;

  const responded = tickets.filter((t) => t.first_response_at);
  const avgFirstResponseHrs = responded.length
    ? Math.round(
        (responded.reduce((sum, t) => sum + (new Date(t.first_response_at!).getTime() - new Date(t.created_at).getTime()), 0) /
          responded.length /
          3600000) *
          10,
      ) / 10
    : null;

  const resolved = tickets.filter((t) => t.resolved_at);
  const avgResolutionHrs = resolved.length
    ? Math.round(
        (resolved.reduce((sum, t) => sum + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()), 0) /
          resolved.length /
          3600000) *
          10,
      ) / 10
    : null;

  const statusCounts = new Map<string, number>();
  for (const t of tickets) statusCounts.set(t.status, (statusCounts.get(t.status) ?? 0) + 1);
  const statusDistribution = Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count }));

  const criticalityCounts = new Map<string, number>();
  for (const t of open) criticalityCounts.set(t.criticality, (criticalityCounts.get(t.criticality) ?? 0) + 1);
  const byCriticality = Array.from(criticalityCounts.entries())
    .map(([criticality, count]) => ({ criticality, count }))
    .sort((a, b) => a.criticality.localeCompare(b.criticality));

  const now = Date.now();
  const buckets = { "0-1d": 0, "1-3d": 0, "3-7d": 0, "7d+": 0 };
  for (const t of open) {
    const days = (now - new Date(t.created_at).getTime()) / 86400000;
    if (days <= 1) buckets["0-1d"] += 1;
    else if (days <= 3) buckets["1-3d"] += 1;
    else if (days <= 7) buckets["3-7d"] += 1;
    else buckets["7d+"] += 1;
  }
  const agingBuckets = Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));

  return {
    kpis: { open: open.length, unrouted, breachingSla, resolvedThisWeek, avgFirstResponseHrs, avgResolutionHrs },
    statusDistribution,
    byCriticality,
    agingBuckets,
  };
}

/** Counts-only rollup via the get_support_summary() RPC — the only support
 * data a client (as opposed to a super_user) can see, since clients have
 * no row-level SELECT on tickets. */
export async function getSupportSummary(projectId: string): Promise<SupportSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_support_summary", { p_project_id: projectId });
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as SupportSummary) ?? null;
}

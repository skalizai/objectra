import { createClient } from "@/lib/supabase/server";
import { getPicklists } from "@/lib/data/picklists";
import { isDoneStatus, isOverdue, DEVELOPMENT_STATUS } from "@/lib/object-meta";
import type { ObjectRow, ObjectStatus, Project } from "@/lib/types/database";

export interface DashboardData {
  projects: Project[];
  kpis: {
    total: number;
    live: number;
    inFlight: number;
    atRisk: number;
  };
  statusDistribution: { status: ObjectStatus; count: number }[];
  byModule: { module: string; count: number }[];
  projectProgress: { projectId: string; name: string; code: string; total: number; live: number; atRisk: number }[];
  deadlineMonitor: (ObjectRow & { project_name: string })[];
}

/**
 * Fetches portfolio-wide data for the dashboard. Relies entirely on RLS —
 * an org_admin sees every project/object, a project_manager sees only the
 * projects they manage, so this query needs no manual role branching.
 */
export async function getDashboardData(orgId: string): Promise<DashboardData> {
  const supabase = await createClient();

  const [{ data: projects }, { statuses }] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    getPicklists(orgId),
  ]);

  const projectList = (projects ?? []) as Project[];
  const projectNameById = new Map(projectList.map((p) => [p.id, p.name]));

  const { data: objects } = await supabase
    .from("objects")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false });

  const objectList = (objects ?? []) as ObjectRow[];

  let live = 0;
  let atRisk = 0;
  const statusCounts = new Map<ObjectStatus, number>();
  const moduleCounts = new Map<string, number>();
  const projectCounts = new Map<string, { total: number; live: number; atRisk: number }>();

  for (const obj of objectList) {
    const done = isDoneStatus(obj.status, statuses);
    const overdue = isOverdue(obj.due_date, obj.status);
    if (done) live += 1;
    if (overdue) atRisk += 1;

    statusCounts.set(obj.status, (statusCounts.get(obj.status) ?? 0) + 1);

    const moduleKey = obj.module?.trim() || "Unassigned";
    moduleCounts.set(moduleKey, (moduleCounts.get(moduleKey) ?? 0) + 1);

    const p = projectCounts.get(obj.project_id) ?? { total: 0, live: 0, atRisk: 0 };
    p.total += 1;
    if (done) p.live += 1;
    if (overdue) p.atRisk += 1;
    projectCounts.set(obj.project_id, p);
  }

  // Objects actively in development, past due — a due date only marks an
  // object "at risk" while it's in Development in Progress (see
  // lib/object-meta.ts); once it moves on, that deadline no longer applies.
  const deadlineMonitor = objectList
    .filter((o) => o.status === DEVELOPMENT_STATUS && o.due_date)
    .slice(0, 8)
    .map((o) => ({ ...o, project_name: projectNameById.get(o.project_id) ?? "—" }));

  return {
    projects: projectList,
    kpis: {
      total: objectList.length,
      live,
      inFlight: objectList.length - live - atRisk,
      atRisk,
    },
    statusDistribution: Array.from(statusCounts.entries()).map(([status, count]) => ({
      status,
      count,
    })),
    byModule: Array.from(moduleCounts.entries())
      .map(([module, count]) => ({ module, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    projectProgress: projectList
      .map((p) => {
        const counts = projectCounts.get(p.id) ?? { total: 0, live: 0, atRisk: 0 };
        return { projectId: p.id, name: p.name, code: p.code, ...counts };
      })
      .filter((p) => p.total > 0)
      .sort((a, b) => b.total - a.total),
    deadlineMonitor,
  };
}

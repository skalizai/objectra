import { createClient } from "@/lib/supabase/server";
import { getPicklists } from "@/lib/data/picklists";
import { isDoneStatus, isOverdue, DEVELOPMENT_STATUS, FUNCTIONAL_TESTING_STATUS, resolveStatusColor } from "@/lib/object-meta";
import type { AssignedRole, ObjectRow, ObjectStatus, Project } from "@/lib/types/database";

export interface ResourceHolding {
  objectId: string;
  wricefId: string | null;
  title: string;
  resourceName: string;
}

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
  projectProgress: {
    projectId: string;
    name: string;
    code: string;
    total: number;
    live: number;
    atRisk: number;
    developmentInProgress: ResourceHolding[];
    functionalTestingInQuality: ResourceHolding[];
  }[];
  statusAccents: { developmentInProgress: string; functionalTestingInQuality: string };
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

  // Who's currently holding an object in each of these two statuses —
  // technical consultant while it's in development, functional consultant
  // once it reaches quality testing (see lib/object-meta.ts).
  const holdingIds = objectList
    .filter((o) => o.status === DEVELOPMENT_STATUS || o.status === FUNCTIONAL_TESTING_STATUS)
    .map((o) => o.id);

  const resourceByObject = new Map<string, Partial<Record<AssignedRole, string>>>();
  if (holdingIds.length > 0) {
    const { data: assignments } = await supabase
      .from("object_assignments")
      .select("object_id, assigned_role, resource:resources(full_name)")
      .in("object_id", holdingIds);

    for (const row of (assignments ?? []) as unknown as {
      object_id: string;
      assigned_role: AssignedRole;
      resource: { full_name: string } | null;
    }[]) {
      if (!row.resource) continue;
      const entry = resourceByObject.get(row.object_id) ?? {};
      entry[row.assigned_role] = row.resource.full_name;
      resourceByObject.set(row.object_id, entry);
    }
  }

  let live = 0;
  let atRisk = 0;
  let inFlight = 0;
  const statusCounts = new Map<ObjectStatus, number>();
  const moduleCounts = new Map<string, number>();
  const projectCounts = new Map<string, { total: number; live: number; atRisk: number }>();
  const devInProgressByProject = new Map<string, ResourceHolding[]>();
  const funcTestingByProject = new Map<string, ResourceHolding[]>();

  for (const obj of objectList) {
    const done = isDoneStatus(obj.status, statuses);
    const overdue = isOverdue(obj.due_date, obj.status);
    if (done) live += 1;
    if (overdue) atRisk += 1;
    if (obj.status === DEVELOPMENT_STATUS) inFlight += 1;

    statusCounts.set(obj.status, (statusCounts.get(obj.status) ?? 0) + 1);

    const moduleKey = obj.module?.trim() || "Unassigned";
    moduleCounts.set(moduleKey, (moduleCounts.get(moduleKey) ?? 0) + 1);

    const p = projectCounts.get(obj.project_id) ?? { total: 0, live: 0, atRisk: 0 };
    p.total += 1;
    if (done) p.live += 1;
    if (overdue) p.atRisk += 1;
    projectCounts.set(obj.project_id, p);

    if (obj.status === DEVELOPMENT_STATUS) {
      const resourceName = resourceByObject.get(obj.id)?.developer;
      if (resourceName) {
        const list = devInProgressByProject.get(obj.project_id) ?? [];
        list.push({ objectId: obj.id, wricefId: obj.wricef_id, title: obj.title, resourceName });
        devInProgressByProject.set(obj.project_id, list);
      }
    } else if (obj.status === FUNCTIONAL_TESTING_STATUS) {
      const resourceName = resourceByObject.get(obj.id)?.functional;
      if (resourceName) {
        const list = funcTestingByProject.get(obj.project_id) ?? [];
        list.push({ objectId: obj.id, wricefId: obj.wricef_id, title: obj.title, resourceName });
        funcTestingByProject.set(obj.project_id, list);
      }
    }
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
      inFlight,
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
        return {
          projectId: p.id,
          name: p.name,
          code: p.code,
          ...counts,
          developmentInProgress: devInProgressByProject.get(p.id) ?? [],
          functionalTestingInQuality: funcTestingByProject.get(p.id) ?? [],
        };
      })
      .filter((p) => p.total > 0)
      .sort((a, b) => b.total - a.total),
    statusAccents: {
      developmentInProgress: resolveStatusColor(DEVELOPMENT_STATUS, statuses),
      functionalTestingInQuality: resolveStatusColor(FUNCTIONAL_TESTING_STATUS, statuses),
    },
    deadlineMonitor,
  };
}

import { createClient } from "@/lib/supabase/server";
import { getPicklists } from "@/lib/data/picklists";
import { isDoneStatus } from "@/lib/object-meta";
import type { ClientObjectRow, Project } from "@/lib/types/database";

export interface ClientProjectStatus {
  project: Project;
  objects: ClientObjectRow[];
  total: number;
  live: number;
  percentComplete: number;
  waves: { wave: string; total: number; live: number }[];
}

/** RLS (project_role = 'client') scopes both queries to the caller's
 * project(s); client_object_view additionally strips internal-only fields. */
export async function getClientProjectStatuses(orgId: string): Promise<ClientProjectStatus[]> {
  const supabase = await createClient();

  const [{ data: projects }, { statuses }] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    getPicklists(orgId),
  ]);

  const projectList = (projects ?? []) as Project[];
  if (projectList.length === 0) return [];

  const { data: objects } = await supabase
    .from("client_object_view")
    .select("*")
    .in(
      "project_id",
      projectList.map((p) => p.id),
    );

  const objectList = (objects ?? []) as ClientObjectRow[];

  return projectList.map((project) => {
    const projectObjects = objectList.filter((o) => o.project_id === project.id);
    const live = projectObjects.filter((o) => isDoneStatus(o.status, statuses)).length;

    const waveMap = new Map<string, { total: number; live: number }>();
    for (const o of projectObjects) {
      const key = o.wave?.trim() || "Unassigned";
      const w = waveMap.get(key) ?? { total: 0, live: 0 };
      w.total += 1;
      if (isDoneStatus(o.status, statuses)) w.live += 1;
      waveMap.set(key, w);
    }

    return {
      project,
      objects: projectObjects,
      total: projectObjects.length,
      live,
      percentComplete: projectObjects.length === 0 ? 0 : Math.round((live / projectObjects.length) * 100),
      waves: Array.from(waveMap.entries())
        .map(([wave, v]) => ({ wave, ...v }))
        .sort((a, b) => a.wave.localeCompare(b.wave)),
    };
  });
}

import { createClient } from "@/lib/supabase/server";
import type { Project, Resource } from "@/lib/types/database";

export interface ProjectWithPm extends Project {
  pm: Pick<Resource, "id" | "full_name" | "email"> | null;
  object_count: number;
}

export async function listProjects(): Promise<ProjectWithPm[]> {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true });

  const projectList = (projects ?? []) as Project[];
  if (projectList.length === 0) return [];

  const pmIds = Array.from(new Set(projectList.map((p) => p.pm_id).filter(Boolean))) as string[];

  const [{ data: pms }, { data: objectCounts }] = await Promise.all([
    pmIds.length
      ? supabase.from("resources").select("id, full_name, email").in("id", pmIds)
      : Promise.resolve({ data: [] as Pick<Resource, "id" | "full_name" | "email">[] }),
    supabase.from("objects").select("project_id"),
  ]);

  const pmById = new Map((pms ?? []).map((p) => [p.id, p]));
  const countByProject = new Map<string, number>();
  for (const row of objectCounts ?? []) {
    const key = row.project_id as string;
    countByProject.set(key, (countByProject.get(key) ?? 0) + 1);
  }

  return projectList.map((p) => ({
    ...p,
    pm: p.pm_id ? pmById.get(p.pm_id) ?? null : null,
    object_count: countByProject.get(p.id) ?? 0,
  }));
}

export async function getProjectById(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  return (data as Project) ?? null;
}

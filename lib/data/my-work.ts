import { createClient } from "@/lib/supabase/server";
import type { ObjectRow } from "@/lib/types/database";

export interface MyWorkItem extends ObjectRow {
  project_name: string;
}

/** RLS (is_assigned_to_object) already restricts this to the caller's
 * assigned objects — no manual filtering needed. */
export async function getMyWork(): Promise<MyWorkItem[]> {
  const supabase = await createClient();

  const { data: objects } = await supabase
    .from("objects")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false });

  const objectList = (objects ?? []) as ObjectRow[];
  if (objectList.length === 0) return [];

  const projectIds = Array.from(new Set(objectList.map((o) => o.project_id)));
  const { data: projects } = await supabase.from("projects").select("id, name").in("id", projectIds);
  const nameById = new Map((projects ?? []).map((p) => [p.id, p.name]));

  return objectList.map((o) => ({ ...o, project_name: nameById.get(o.project_id) ?? "—" }));
}

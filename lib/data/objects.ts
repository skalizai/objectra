import { createClient } from "@/lib/supabase/server";
import type { AssignedRole, ObjectAssignment, ObjectRow, Resource } from "@/lib/types/database";

export interface ObjectWithAssignees extends ObjectRow {
  assignees: {
    id: string;
    resource: Pick<Resource, "id" | "full_name" | "email">;
    assigned_role: AssignedRole;
  }[];
}

export async function listObjectsForProject(projectId: string): Promise<ObjectWithAssignees[]> {
  const supabase = await createClient();

  const { data: objects } = await supabase
    .from("objects")
    .select("*")
    .eq("project_id", projectId)
    .order("due_date", { ascending: true, nullsFirst: false });

  const objectList = (objects ?? []) as ObjectRow[];
  if (objectList.length === 0) return [];

  const objectIds = objectList.map((o) => o.id);
  const { data: assignments } = await supabase
    .from("object_assignments")
    .select("id, object_id, assigned_role, resource:resources(id, full_name, email)")
    .in("object_id", objectIds);

  const byObject = new Map<string, ObjectWithAssignees["assignees"]>();
  for (const row of (assignments ?? []) as unknown as (ObjectAssignment & {
    resource: Pick<Resource, "id" | "full_name" | "email">;
  })[]) {
    const list = byObject.get(row.object_id) ?? [];
    list.push({ id: row.id, resource: row.resource, assigned_role: row.assigned_role });
    byObject.set(row.object_id, list);
  }

  return objectList.map((o) => ({ ...o, assignees: byObject.get(o.id) ?? [] }));
}

/** Every resource in the org roster is assignable as a Functional/Technical
 * consultant, whether or not they've been invited yet — assignment is
 * tracking, not login access (see migration 0013). */
export async function getResourcesForAssignment(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resources")
    .select("id, full_name, email, consultant_type")
    .eq("org_id", orgId)
    .order("full_name");

  return (data ?? []) as Pick<Resource, "id" | "full_name" | "email" | "consultant_type">[];
}

export interface AuditTrailEntry {
  id: string;
  object_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  changed_by_profile: { full_name: string } | null;
  object_title: string;
}

export async function getAuditLogForProject(projectId: string, limit = 25): Promise<AuditTrailEntry[]> {
  const supabase = await createClient();

  const { data: objects } = await supabase.from("objects").select("id, title").eq("project_id", projectId);
  const objectList = objects ?? [];
  if (objectList.length === 0) return [];

  const { data } = await supabase
    .from("audit_log")
    .select("*, changed_by_profile:profiles(full_name)")
    .in(
      "object_id",
      objectList.map((o) => o.id),
    )
    .order("changed_at", { ascending: false })
    .limit(limit);

  const titleById = new Map(objectList.map((o) => [o.id, o.title]));

  return ((data ?? []) as unknown as Omit<AuditTrailEntry, "object_title">[]).map((row) => ({
    ...row,
    object_title: titleById.get(row.object_id) ?? "—",
  }));
}

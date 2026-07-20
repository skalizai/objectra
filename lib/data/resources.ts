import { createClient } from "@/lib/supabase/server";
import type { Project, ProjectMemberRole, Resource } from "@/lib/types/database";

export interface ResourceAllocation {
  membership_id: string;
  project_id: string;
  project_name: string;
  project_status: Project["status"];
  role: ProjectMemberRole;
  allocation_pct: number;
}

export interface ResourceWithAllocation extends Resource {
  allocations: ResourceAllocation[];
  activeAllocationTotal: number;
  overAllocated: boolean;
}

/** Lists the org's resource roster (supabase/migrations/0011_resources_roster.sql)
 * — this is master data saved independently of login access, so it
 * includes people who haven't been invited yet. Allocation is only
 * meaningful once a resource has been invited and added to a project
 * (profile_id set), so uninvited rows simply show none. */
export async function listResources(orgId: string): Promise<ResourceWithAllocation[]> {
  const supabase = await createClient();

  const { data: resources } = await supabase
    .from("resources")
    .select("*")
    .eq("org_id", orgId)
    .order("full_name");

  const resourceList = (resources ?? []) as Resource[];
  if (resourceList.length === 0) return [];

  const profileIds = resourceList.map((r) => r.profile_id).filter((id): id is string => !!id);

  const byProfile = new Map<string, ResourceAllocation[]>();
  if (profileIds.length > 0) {
    const { data: memberships } = await supabase
      .from("project_members")
      .select("id, profile_id, project_id, role, allocation_pct, is_active, project:projects(id, name, status)")
      .in("profile_id", profileIds)
      .eq("is_active", true);

    for (const row of (memberships ?? []) as unknown as Array<{
      id: string;
      profile_id: string;
      role: ProjectMemberRole;
      allocation_pct: number;
      project: Pick<Project, "id" | "name" | "status">;
    }>) {
      const list = byProfile.get(row.profile_id) ?? [];
      list.push({
        membership_id: row.id,
        project_id: row.project.id,
        project_name: row.project.name,
        project_status: row.project.status,
        role: row.role,
        allocation_pct: row.allocation_pct,
      });
      byProfile.set(row.profile_id, list);
    }
  }

  return resourceList.map((resource) => {
    const allocations = resource.profile_id ? byProfile.get(resource.profile_id) ?? [] : [];
    const activeAllocationTotal = allocations
      .filter((a) => a.project_status === "active")
      .reduce((sum, a) => sum + a.allocation_pct, 0);

    return {
      ...resource,
      allocations,
      activeAllocationTotal,
      overAllocated: activeAllocationTotal > 100,
    };
  });
}

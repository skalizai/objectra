import { createClient } from "@/lib/supabase/server";
import type { Profile, ProjectMemberRole } from "@/lib/types/database";

export interface MemberMembership {
  id: string;
  project_id: string;
  project_name: string;
  role: ProjectMemberRole;
}

export interface MemberWithMemberships extends Profile {
  memberships: MemberMembership[];
}

/** Org-wide member list for Settings → Member management, each with their
 * per-project roles so an admin can edit role assignments in place. */
export async function listOrgMembersWithMemberships(orgId: string): Promise<MemberWithMemberships[]> {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("org_id", orgId)
    .order("full_name");

  const profileList = (profiles ?? []) as Profile[];
  if (profileList.length === 0) return [];

  const { data: memberships } = await supabase
    .from("project_members")
    .select("id, profile_id, project_id, role, project:projects(name)")
    .in(
      "profile_id",
      profileList.map((p) => p.id),
    )
    .eq("is_active", true);

  const byProfile = new Map<string, MemberMembership[]>();
  for (const row of (memberships ?? []) as unknown as Array<{
    id: string;
    profile_id: string;
    project_id: string;
    role: ProjectMemberRole;
    project: { name: string };
  }>) {
    const list = byProfile.get(row.profile_id) ?? [];
    list.push({ id: row.id, project_id: row.project_id, project_name: row.project.name, role: row.role });
    byProfile.set(row.profile_id, list);
  }

  return profileList.map((profile) => ({ ...profile, memberships: byProfile.get(profile.id) ?? [] }));
}

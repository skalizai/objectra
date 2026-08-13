import { createClient } from "@/lib/supabase/server";
import type { ViewerRole } from "@/lib/nav";
import type { Profile, ProjectMemberRole } from "@/lib/types/database";

export interface Viewer {
  user: { id: string; email: string };
  profile: Profile;
  /** Highest-privilege role across the org/projects, used to pick the nav. */
  role: ViewerRole;
  /** project_id -> role, for scoping project-level UI. */
  projectRoles: Record<string, ProjectMemberRole>;
}

const ROLE_PRIORITY: ProjectMemberRole[] = [
  "project_manager",
  "technical_lead",
  "member",
  "super_user",
  "client",
];

/** Returns null if there's no session or no profile yet (mid-signup). */
export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  const { data: memberships } = await supabase
    .from("project_members")
    .select("project_id, role")
    .eq("profile_id", user.id)
    .eq("is_active", true);

  const projectRoles: Record<string, ProjectMemberRole> = {};
  for (const m of memberships ?? []) {
    projectRoles[m.project_id as string] = m.role as ProjectMemberRole;
  }

  let role: ViewerRole = "client";
  if (profile.is_org_admin) {
    role = "org_admin";
  } else {
    const roles = new Set(Object.values(projectRoles));
    role = (ROLE_PRIORITY.find((r) => roles.has(r)) as ViewerRole | undefined) ?? "client";
  }

  return {
    user: { id: user.id, email: user.email ?? profile.email },
    profile: profile as Profile,
    role,
    projectRoles,
  };
}

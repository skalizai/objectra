"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/get-viewer";

export interface CreateProjectState {
  error: string | null;
}

export async function createProject(
  _prevState: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  const name = String(formData.get("name") ?? "").trim();
  const clientName = String(formData.get("client_name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const targetGoLive = String(formData.get("target_go_live") ?? "").trim();
  // pm_id is a resources.id now (picked from the roster, invited or not —
  // see migration 0016), not a profiles.id. Real editing access still
  // flows through project_members.profile_id below, resolved separately.
  const pmResourceId = String(formData.get("pm_id") ?? "").trim();
  const companyCode = String(formData.get("company_code") ?? "").trim();
  const stream = String(formData.get("stream") ?? "").trim();

  if (!name || !clientName || !code) {
    return { error: "Name, client, and code are required." };
  }

  const supabase = await createClient();

  let pmProfileId: string | null = viewer.user.id;
  let pmId = pmResourceId || null;
  if (pmResourceId) {
    const { data: resource } = await supabase
      .from("resources")
      .select("profile_id")
      .eq("id", pmResourceId)
      .maybeSingle();
    // Only invited resources have a login to grant project access to —
    // an uninvited pick is still shown as the PM, just without access yet.
    pmProfileId = resource?.profile_id ?? null;
  } else {
    // No PM chosen — fall back to whichever roster entry (if any)
    // represents the creator, so "Project manager" doesn't just say
    // Unassigned when it's obviously them.
    const { data: selfResource } = await supabase
      .from("resources")
      .select("id")
      .eq("org_id", viewer.profile.org_id)
      .eq("profile_id", viewer.user.id)
      .maybeSingle();
    pmId = selfResource?.id ?? null;
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      org_id: viewer.profile.org_id,
      name,
      client_name: clientName,
      code,
      start_date: startDate || null,
      target_go_live: targetGoLive || null,
      pm_id: pmId,
      company_code: companyCode || null,
      stream: stream || null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  // The creator (or chosen PM, if already invited) needs a project_members
  // row to satisfy project-scoped RLS on everything else (objects,
  // assignments, etc). An uninvited PM pick simply gets one once invited.
  await supabase.from("project_members").insert({
    project_id: project.id,
    profile_id: pmProfileId ?? viewer.user.id,
    role: "project_manager",
    allocation_pct: 0,
  });

  await supabase.from("notification_settings").insert({ project_id: project.id });

  // Default SLA targets (section 16 of the ticketing addendum) — seeded
  // from app code the same way notification_settings is, so a project can
  // still be created without them and an admin can freely edit/replace
  // them later from Settings -> Support.
  await supabase.from("sla_policies").insert([
    { project_id: project.id, criticality: "P1_critical", response_mins: 60, resolve_mins: 240 },
    { project_id: project.id, criticality: "P2_high", response_mins: 240, resolve_mins: 1440 },
    { project_id: project.id, criticality: "P3_medium", response_mins: 1440, resolve_mins: 4320 },
    { project_id: project.id, criticality: "P4_low", response_mins: 2880, resolve_mins: 10080 },
  ]);

  revalidatePath("/projects");
  // /projects/[id] renders the Overview page directly (no server redirect),
  // so it's safe to land here — see the comment on ProjectCard's Link.
  redirect(`/projects/${project.id}`);
}

export interface UpdateProjectState {
  error: string | null;
  success: boolean;
}

/** Org-admin or the project's PM/Technical Lead, per the projects_update
 * RLS policy (is_project_editor). */
export async function updateProject(
  projectId: string,
  _prevState: UpdateProjectState,
  formData: FormData,
): Promise<UpdateProjectState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  const name = String(formData.get("name") ?? "").trim();
  const clientName = String(formData.get("client_name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const status = String(formData.get("status") ?? "active");
  const startDate = String(formData.get("start_date") ?? "").trim();
  const targetGoLive = String(formData.get("target_go_live") ?? "").trim();
  // pm_id is a resources.id (see migration 0016) — real editing access is
  // unaffected, it's still granted via project_members separately.
  const pmId = String(formData.get("pm_id") ?? "").trim();
  const companyCode = String(formData.get("company_code") ?? "").trim();
  const stream = String(formData.get("stream") ?? "").trim();

  if (!name || !clientName || !code) {
    return { error: "Name, client, and code are required.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      name,
      client_name: clientName,
      code,
      status,
      start_date: startDate || null,
      target_go_live: targetGoLive || null,
      pm_id: pmId || null,
      company_code: companyCode || null,
      stream: stream || null,
    })
    .eq("id", projectId);

  if (error) return { error: error.message, success: false };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return { error: null, success: true };
}

export interface DeleteProjectState {
  error: string | null;
}

/** Org-admin only, per the projects_delete RLS policy. Cascades to every
 * dependent row (objects, assignments, invitations, notification_settings)
 * via ON DELETE CASCADE in the schema. */
export async function deleteProject(projectId: string): Promise<DeleteProjectState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  if (viewer.role !== "org_admin") return { error: "Only org admins can delete a project." };

  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) return { error: error.message };

  revalidatePath("/projects");
  return { error: null };
}

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
  const pmId = String(formData.get("pm_id") ?? "").trim();
  const companyCode = String(formData.get("company_code") ?? "").trim();
  const stream = String(formData.get("stream") ?? "").trim();

  if (!name || !clientName || !code) {
    return { error: "Name, client, and code are required." };
  }

  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      org_id: viewer.profile.org_id,
      name,
      client_name: clientName,
      code,
      start_date: startDate || null,
      target_go_live: targetGoLive || null,
      pm_id: pmId || viewer.user.id,
      company_code: companyCode || null,
      stream: stream || null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  // The creator (or chosen PM) needs a project_members row to satisfy
  // project-scoped RLS on everything else (objects, assignments, etc).
  await supabase.from("project_members").insert({
    project_id: project.id,
    profile_id: pmId || viewer.user.id,
    role: "project_manager",
    allocation_pct: 0,
  });

  await supabase.from("notification_settings").insert({ project_id: project.id });

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

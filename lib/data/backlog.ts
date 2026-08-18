import { createClient } from "@/lib/supabase/server";
import type { BacklogApprovalLogEntry, BacklogItem } from "@/lib/types/database";

/** RLS (backlog_items_select) scopes this to org_admin/PM/technical_lead --
 * every other role gets zero rows. Omitting projectId returns every
 * backlog item across every project the viewer can see (the portfolio
 * dashboard's "All projects" view) rather than one project's items. */
export async function getBacklogItems(projectId?: string): Promise<BacklogItem[]> {
  const supabase = await createClient();
  let query = supabase.from("backlog_items").select("*").order("created_at", { ascending: true });
  if (projectId) query = query.eq("project_id", projectId);
  const { data } = await query;

  return (data ?? []) as BacklogItem[];
}

export interface BacklogApprover {
  id: string;
  full_name: string;
  email: string;
}

/** Resolves who "Send for approval" notifies: the project's configured
 * backlog_approver_id, falling back to the project's own PM (pm_id) if
 * unset -- both are resources, not profiles, same "assign before invite"
 * pattern as routing/SLA escalation, so this works even if that person
 * hasn't logged in yet. Returns null only if neither is set. */
export async function getBacklogApprover(projectId: string): Promise<BacklogApprover | null> {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("backlog_approver_id, pm_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return null;

  const resourceId = project.backlog_approver_id ?? project.pm_id;
  if (!resourceId) return null;

  const { data: resource } = await supabase
    .from("resources")
    .select("id, full_name, email")
    .eq("id", resourceId)
    .maybeSingle();

  return resource as BacklogApprover | null;
}

export async function getBacklogApprovalLog(projectId: string): Promise<BacklogApprovalLogEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("backlog_approval_log")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return (data ?? []) as BacklogApprovalLogEntry[];
}

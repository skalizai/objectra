import { createClient } from "@/lib/supabase/server";
import type { BacklogItem } from "@/lib/types/database";

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

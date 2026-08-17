import { createClient } from "@/lib/supabase/server";
import type { BacklogItem } from "@/lib/types/database";

/** RLS (backlog_items_select) scopes this to org_admin/PM/technical_lead --
 * every other role gets zero rows. */
export async function getBacklogItems(projectId: string): Promise<BacklogItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("backlog_items")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  return (data ?? []) as BacklogItem[];
}

import { createClient } from "@/lib/supabase/server";
import type { IntegrationLogEntry, TeamsConnection } from "@/lib/types/database";

export async function getTeamsConnection(projectId: string): Promise<TeamsConnection | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("teams_connections").select("*").eq("project_id", projectId).maybeSingle();
  return data as TeamsConnection | null;
}

export async function getIntegrationLog(projectId: string, limit = 20): Promise<IntegrationLogEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("integration_log")
    .select("*")
    .eq("project_id", projectId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as IntegrationLogEntry[];
}

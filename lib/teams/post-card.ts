import { createAdminClient } from "@/lib/supabase/admin";
import type { AdaptiveCard } from "@/lib/teams/cards";
import type { TeamsConnection } from "@/lib/types/database";

type Admin = ReturnType<typeof createAdminClient>;

export interface PostCardResult {
  ok: boolean;
  error: string | null;
}

async function logOutbound(admin: Admin, projectId: string, event: string, status: "ok" | "failed", error: string | null) {
  await admin.from("integration_log").insert({ project_id: projectId, direction: "outbound", event, status, error });
}

async function postOnce(url: string, card: AdaptiveCard): Promise<PostCardResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(card),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/** Fire-and-forget poster used by ticket actions and sla-scan -- always
 * resolves (never throws/rejects), so a dead or unconfigured webhook can
 * never block the underlying ticket operation. Retries once before giving
 * up and logging to integration_log. */
export async function postTeamsCard(projectId: string, card: AdaptiveCard, event: string): Promise<PostCardResult> {
  const admin = createAdminClient();
  const { data } = await admin.from("teams_connections").select("*").eq("project_id", projectId).maybeSingle();
  const connection = data as TeamsConnection | null;

  if (!connection || !connection.is_active || !connection.outbound_webhook_url) {
    return { ok: false, error: "No active Teams connection configured for this project." };
  }

  let result = await postOnce(connection.outbound_webhook_url, card);
  if (!result.ok) result = await postOnce(connection.outbound_webhook_url, card);

  await logOutbound(admin, projectId, event, result.ok ? "ok" : "failed", result.error);
  return result;
}

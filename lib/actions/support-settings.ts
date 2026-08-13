"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/get-viewer";
import { sendTestTicketEmail as sendTestTicketEmailFixture } from "@/lib/email/notify-ticket";
import type { ProjectPhase, TicketCriticality } from "@/lib/types/database";

export interface SimpleActionState {
  error: string | null;
  success: boolean;
}

export async function updateProjectPhase(
  projectId: string,
  phase: ProjectPhase,
  goLiveDate: string | null,
): Promise<SimpleActionState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ phase, go_live_date: goLiveDate || null })
    .eq("id", projectId);

  if (error) return { error: error.message, success: false };
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/settings");
  return { error: null, success: true };
}

export async function upsertSupportRouting(
  projectId: string,
  module: string,
  primaryConsultantId: string | null,
  backupConsultantId: string | null,
  isActive: boolean,
): Promise<SimpleActionState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  if (!module.trim()) return { error: "Module is required.", success: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("support_routing")
    .upsert(
      {
        project_id: projectId,
        module: module.trim(),
        primary_consultant_id: primaryConsultantId,
        backup_consultant_id: backupConsultantId,
        is_active: isActive,
      },
      { onConflict: "project_id,module" },
    );

  if (error) return { error: error.message, success: false };
  revalidatePath("/settings");
  return { error: null, success: true };
}

export async function deleteSupportRouting(routingId: string): Promise<SimpleActionState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  const supabase = await createClient();
  const { error } = await supabase.from("support_routing").delete().eq("id", routingId);
  if (error) return { error: error.message, success: false };

  revalidatePath("/settings");
  return { error: null, success: true };
}

export async function upsertSlaPolicy(
  projectId: string,
  criticality: TicketCriticality,
  responseMins: number,
  resolveMins: number,
): Promise<SimpleActionState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  const supabase = await createClient();
  const { error } = await supabase
    .from("sla_policies")
    .upsert(
      { project_id: projectId, criticality, response_mins: responseMins, resolve_mins: resolveMins },
      { onConflict: "project_id,criticality" },
    );

  if (error) return { error: error.message, success: false };
  revalidatePath("/settings");
  return { error: null, success: true };
}

/** Ticket emails are event-driven (fired from server actions as tickets
 * change), not job-driven like the weekly digest — so unlike
 * sendTestDigest(), which re-runs the real job with a force flag, this
 * builds a fixture email and sends it directly. Intentional, not an
 * oversight. */
export async function sendTestTicketEmail(projectId: string): Promise<SimpleActionState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  try {
    const result = await sendTestTicketEmailFixture(projectId, viewer.user.email);
    if (!result.sent) return { error: result.error ?? "Test email failed to send.", success: false };
    return { error: null, success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error", success: false };
  }
}

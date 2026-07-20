"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/get-viewer";
import { runWeeklyDigest } from "@/lib/jobs/weekly-digest";
import type { DigestDay, ProjectMemberRole } from "@/lib/types/database";

export interface SimpleActionState {
  error: string | null;
  success: boolean;
}

export async function updateNotificationSettings(
  projectId: string,
  _prevState: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notification_settings")
    .update({
      deadline_alerts_enabled: formData.get("deadline_alerts_enabled") === "on",
      deadline_lead_days: Number(formData.get("deadline_lead_days") ?? 7),
      weekly_digest_enabled: formData.get("weekly_digest_enabled") === "on",
      digest_day: String(formData.get("digest_day") ?? "mon") as DigestDay,
      digest_recipients: {
        pms: formData.get("recipients_pms") === "on",
        clients: formData.get("recipients_clients") === "on",
      },
    })
    .eq("project_id", projectId);

  if (error) return { error: error.message, success: false };

  revalidatePath("/settings");
  return { error: null, success: true };
}

export async function sendTestDigest(projectId: string): Promise<SimpleActionState> {
  try {
    const result = await runWeeklyDigest({ projectId, force: true });
    if (result.emailsFailed > 0 && result.emailsSent === 0) {
      return { error: "Test digest failed to send.", success: false };
    }
    return { error: null, success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error", success: false };
  }
}

export async function updateOrgProfile(
  _prevState: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "org_admin") {
    return { error: "Only org admins can update the org profile.", success: false };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Organisation name is required.", success: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ name })
    .eq("id", viewer.profile.org_id);

  if (error) return { error: error.message, success: false };

  revalidatePath("/settings");
  return { error: null, success: true };
}

export async function setMemberActive(profileId: string, isActive: boolean) {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "org_admin") return { error: "Not authorized." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", profileId);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: null };
}

/** Admin editing someone else's display name. */
export async function updateMemberName(profileId: string, fullName: string) {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "org_admin") return { error: "Not authorized." };
  if (!fullName.trim()) return { error: "Name can't be empty." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName.trim() })
    .eq("id", profileId);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: null };
}

/** Any signed-in user editing their own display name. */
export async function updateOwnName(_prevState: SimpleActionState, formData: FormData): Promise<SimpleActionState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Not signed in.", success: false };

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return { error: "Name can't be empty.", success: false };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", viewer.user.id);
  if (error) return { error: error.message, success: false };

  revalidatePath("/settings");
  return { error: null, success: true };
}

/** Admin changing someone's role on one of their project memberships —
 * Project Manager and Technical Lead are both full-edit roles on that
 * project; Member stays restricted to their own assigned objects. */
export async function updateMemberProjectRole(projectMemberId: string, role: ProjectMemberRole) {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "org_admin") return { error: "Not authorized." };

  const supabase = await createClient();
  const { error } = await supabase.from("project_members").update({ role }).eq("id", projectMemberId);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: null };
}

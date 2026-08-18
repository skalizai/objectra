"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/get-viewer";

export interface SimpleActionState {
  error: string | null;
  success: boolean;
}

/** Who "Send for approval" notifies -- a resource (not a profile), so it
 * can be set before that person has accepted an invite, same as
 * projects.pm_id. Passing null clears it (falls back to the PM). */
export async function updateBacklogApprover(projectId: string, resourceId: string | null): Promise<SimpleActionState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ backlog_approver_id: resourceId })
    .eq("id", projectId);

  if (error) return { error: error.message, success: false };
  revalidatePath("/settings");
  return { error: null, success: true };
}

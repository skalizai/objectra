"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/get-viewer";

export interface SimpleActionState {
  error: string | null;
  success: boolean;
}

export async function upsertBacklogRateSettings(
  projectId: string,
  field:
    | "tech_rate"
    | "func_rate"
    | "pmo_rate"
    | "fiori_rate"
    | "hours_per_day"
    | "monthly_hours"
    | "pmo_half_time_factor"
    | "project_months"
    | "pgls_months",
  value: number,
): Promise<SimpleActionState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  const supabase = await createClient();
  const { error } = await supabase
    .from("backlog_rate_settings")
    .upsert({ project_id: projectId, [field]: value }, { onConflict: "project_id" });

  if (error) return { error: error.message, success: false };
  revalidatePath("/settings");
  revalidatePath(`/projects/${projectId}/backlog`);
  return { error: null, success: true };
}

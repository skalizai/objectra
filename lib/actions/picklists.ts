"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/get-viewer";
import type { PicklistType } from "@/lib/types/database";

export interface PicklistActionState {
  error: string | null;
}

export async function addPicklistItem(
  type: PicklistType,
  _prevState: PicklistActionState,
  formData: FormData,
): Promise<PicklistActionState> {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "org_admin") {
    return { error: "Only org admins can manage settings." };
  }

  const value = String(formData.get("value") ?? "").trim();
  if (!value) return { error: "Value is required." };

  const color = String(formData.get("color") ?? "").trim() || null;
  const isDone = formData.get("is_done") === "on";

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("picklists")
    .select("id")
    .eq("org_id", viewer.profile.org_id)
    .eq("type", type)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextSortOrder = existing?.[0] ? undefined : 0;

  const { error } = await supabase.from("picklists").upsert(
    {
      org_id: viewer.profile.org_id,
      type,
      value,
      color: type === "status" ? color : null,
      is_done: type === "status" ? isDone : false,
      is_active: true,
      ...(nextSortOrder !== undefined ? { sort_order: nextSortOrder } : {}),
    },
    { onConflict: "org_id,type,value" },
  );

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: null };
}

export async function removePicklistItem(id: string) {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "org_admin") return { error: "Not authorized." };

  const supabase = await createClient();
  // Soft delete — objects/resources may already reference this value.
  const { error } = await supabase.from("picklists").update({ is_active: false }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: null };
}

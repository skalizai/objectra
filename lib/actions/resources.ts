"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/get-viewer";

export interface AddResourceState {
  error: string | null;
  success: boolean;
}

/** Saves a resource to the org roster — no auth account, no email, exactly
 * like adding a picklist value. Inviting them (creating login access) is a
 * separate step via inviteResourceRecord(). */
export async function addResource(
  _prevState: AddResourceState,
  formData: FormData,
): Promise<AddResourceState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Not signed in.", success: false };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!fullName || !email) {
    return { error: "Name and email are required.", success: false };
  }

  const allowedAllocations = [25, 50, 75, 100];
  const allocationPct = Number(formData.get("allocation_pct") ?? 50);

  const supabase = await createClient();
  const { error } = await supabase.from("resources").insert({
    org_id: viewer.profile.org_id,
    full_name: fullName,
    email,
    consultant_type: String(formData.get("consultant_type") ?? "").trim() || null,
    role_title: String(formData.get("role_title") ?? "").trim() || null,
    primary_module: String(formData.get("primary_module") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    allocation_pct: allowedAllocations.includes(allocationPct) ? allocationPct : 50,
    created_by: viewer.user.id,
  });

  if (error) {
    return {
      error: error.code === "23505" ? "A resource with this email already exists." : error.message,
      success: false,
    };
  }

  revalidatePath("/resources");
  return { error: null, success: true };
}

const ALLOWED_ALLOCATIONS = [25, 50, 75, 100];

export interface UpdateResourceFields {
  full_name?: string;
  email?: string;
  consultant_type?: string | null;
  role_title?: string | null;
  primary_module?: string | null;
  location?: string | null;
  allocation_pct?: number;
}

/** Edits a roster row directly — name/email, type/role/area/location, and
 * (for resources not yet invited to any project) their planned
 * allocation %. Editing name/email here only updates the roster entry —
 * if the resource has already been invited, their actual login email and
 * profile name are separate and unaffected. */
export async function updateResource(resourceId: string, fields: UpdateResourceFields) {
  const viewer = await getViewer();
  if (!viewer) return { error: "Not signed in." };

  if (fields.allocation_pct !== undefined && !ALLOWED_ALLOCATIONS.includes(fields.allocation_pct)) {
    return { error: "Allocation must be 25, 50, 75, or 100%." };
  }

  const update: UpdateResourceFields = { ...fields };
  if (update.full_name !== undefined) {
    update.full_name = update.full_name.trim();
    if (!update.full_name) return { error: "Name is required." };
  }
  if (update.email !== undefined) {
    update.email = update.email.trim().toLowerCase();
    if (!update.email || !update.email.includes("@")) return { error: "Enter a valid email." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("resources").update(update).eq("id", resourceId);
  if (error) {
    return { error: error.code === "23505" ? "A resource with this email already exists." : error.message };
  }

  revalidatePath("/resources");
  return { error: null };
}

/** Edits the allocation % on one of a resource's actual project
 * memberships (once they're invited, allocation lives per-project). */
export async function updateResourceProjectAllocation(projectMemberId: string, allocationPct: number) {
  const viewer = await getViewer();
  if (!viewer) return { error: "Not signed in." };
  if (!ALLOWED_ALLOCATIONS.includes(allocationPct)) {
    return { error: "Allocation must be 25, 50, 75, or 100%." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("project_members")
    .update({ allocation_pct: allocationPct })
    .eq("id", projectMemberId);
  if (error) return { error: error.message };

  revalidatePath("/resources");
  return { error: null };
}

export interface DeleteResourceState {
  error: string | null;
}

/** Removes one resource from the roster — RLS (resources_write) scopes
 * this to org_admin/PM/technical_lead already; only the targeted row is
 * touched, every other resource is untouched. Cascades to that resource's
 * own object_assignments (so they stop showing as a consultant anywhere)
 * but leaves their profile/login and project_members untouched — deleting
 * a roster entry doesn't revoke access, it just stops tracking them here. */
export async function deleteResource(resourceId: string): Promise<DeleteResourceState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("resources").delete().eq("id", resourceId);
  if (error) return { error: error.message };

  revalidatePath("/resources");
  return { error: null };
}

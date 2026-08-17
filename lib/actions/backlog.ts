"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/get-viewer";
import { getBacklogRateSettings } from "@/lib/data/backlog";
import { notifyBacklogApprovalRequest } from "@/lib/email/notify-backlog";
import type { BacklogItemStatus, BacklogRateSettings, ObjectType } from "@/lib/types/database";

export interface FormActionState {
  error: string | null;
}

export interface SimpleActionState {
  error: string | null;
  success: boolean;
}

function bandComplexity(devDays: number): string {
  if (devDays <= 3) return "Low";
  if (devDays <= 8) return "Medium";
  if (devDays <= 15) return "High";
  return "Very High";
}

/** Dev/Fiori/Functional hours+cost are pure per-row math -- computed here
 * on every write so the stored columns are always consistent with the
 * project's current rate settings at the moment of the edit. (PMO/PGLS
 * cost is NOT computed here -- see lib/data/backlog.ts for why those are
 * read-time-only.) */
function computeRowCost(
  days: { dev: number; fiori: number; func: number },
  rates: BacklogRateSettings,
) {
  const devHours = days.dev * rates.hours_per_day;
  const fioriHours = days.fiori * rates.hours_per_day;
  const funcHours = days.func * rates.hours_per_day;
  return {
    dev_days: days.dev,
    dev_hours: devHours,
    dev_cost: devHours * rates.tech_rate,
    fiori_days: days.fiori,
    fiori_hours: fioriHours,
    fiori_cost: fioriHours * rates.fiori_rate,
    func_days: days.func,
    func_hours: funcHours,
    func_cost: funcHours * rates.func_rate,
  };
}

function readDays(formData: FormData, field: string): number {
  const raw = Number(formData.get(field));
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

export async function createBacklogItem(
  projectId: string,
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  const description = String(formData.get("description") ?? "").trim();
  if (!description) return { error: "Description is required." };

  const devDays = readDays(formData, "dev_days");
  const fioriDays = readDays(formData, "fiori_days");
  const funcDays = readDays(formData, "func_days");
  const complexity = String(formData.get("complexity") ?? "").trim() || bandComplexity(devDays);

  const supabase = await createClient();
  const rates = await getBacklogRateSettings(projectId);

  const { error } = await supabase.from("backlog_items").insert({
    project_id: projectId,
    // item_no is intentionally omitted -- the backlog_items_01_set_item_no
    // trigger fills it in from the project name + sequence.
    company_code: String(formData.get("company_code") ?? "").trim() || null,
    module: String(formData.get("module") ?? "").trim() || null,
    lob: String(formData.get("lob") ?? "").trim() || null,
    dev_type: String(formData.get("dev_type") ?? "").trim() || null,
    description,
    requested_by: String(formData.get("requested_by") ?? "").trim() || null,
    complexity,
    go_live_critical: formData.get("go_live_critical") === "yes",
    ...computeRowCost({ dev: devDays, fiori: fioriDays, func: funcDays }, rates),
    remarks: String(formData.get("remarks") ?? "").trim() || null,
    created_by: viewer.user.id,
    updated_by: viewer.user.id,
  });

  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}/backlog`);
  return { error: null };
}

export async function updateBacklogItem(
  itemId: string,
  projectId: string,
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  const description = String(formData.get("description") ?? "").trim();
  if (!description) return { error: "Description is required." };

  const devDays = readDays(formData, "dev_days");
  const fioriDays = readDays(formData, "fiori_days");
  const funcDays = readDays(formData, "func_days");
  const complexity = String(formData.get("complexity") ?? "").trim() || bandComplexity(devDays);

  const supabase = await createClient();
  const rates = await getBacklogRateSettings(projectId);

  const { error } = await supabase
    .from("backlog_items")
    .update({
      company_code: String(formData.get("company_code") ?? "").trim() || null,
      module: String(formData.get("module") ?? "").trim() || null,
      lob: String(formData.get("lob") ?? "").trim() || null,
      dev_type: String(formData.get("dev_type") ?? "").trim() || null,
      description,
      requested_by: String(formData.get("requested_by") ?? "").trim() || null,
      complexity,
      go_live_critical: formData.get("go_live_critical") === "yes",
      ...computeRowCost({ dev: devDays, fiori: fioriDays, func: funcDays }, rates),
      remarks: String(formData.get("remarks") ?? "").trim() || null,
      updated_by: viewer.user.id,
    })
    .eq("id", itemId)
    .eq("project_id", projectId);

  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}/backlog`);
  return { error: null };
}

export async function deleteBacklogItem(itemId: string, projectId: string): Promise<SimpleActionState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  const supabase = await createClient();
  const { error } = await supabase.from("backlog_items").delete().eq("id", itemId).eq("project_id", projectId);
  if (error) return { error: error.message, success: false };

  revalidatePath(`/projects/${projectId}/backlog`);
  return { error: null, success: true };
}

/** Bulk-transitions selected items (must currently be 'registered') to
 * 'sent_for_approval', stamps cr_no + sent_for_approval_at, and fires the
 * client approval email. Event-driven, not a cron job -- same shape as
 * notifyTicketCreated(). */
export async function sendForApproval(
  projectId: string,
  itemIds: string[],
  crNo: string,
): Promise<SimpleActionState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  if (itemIds.length === 0) return { error: "Select at least one item.", success: false };
  if (!crNo.trim()) return { error: "A CR number is required.", success: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("backlog_items")
    .update({
      status: "sent_for_approval",
      cr_no: crNo.trim(),
      sent_for_approval_at: new Date().toISOString(),
      updated_by: viewer.user.id,
    })
    .eq("project_id", projectId)
    .eq("status", "registered")
    .in("id", itemIds);

  if (error) return { error: error.message, success: false };

  revalidatePath(`/projects/${projectId}/backlog`);
  await notifyBacklogApprovalRequest(projectId, itemIds, crNo.trim());
  return { error: null, success: true };
}

/** Approve/reject/hold from the register or drawer. Approving stamps
 * approval_date; the other two just move status (a rejected/on_hold item
 * can be re-sent for approval later by selecting it again). */
export async function updateBacklogStatus(
  itemId: string,
  projectId: string,
  status: Extract<BacklogItemStatus, "approved" | "rejected" | "on_hold" | "registered">,
): Promise<SimpleActionState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  const supabase = await createClient();
  const { error } = await supabase
    .from("backlog_items")
    .update({
      status,
      approval_date: status === "approved" ? new Date().toISOString().slice(0, 10) : null,
      updated_by: viewer.user.id,
    })
    .eq("id", itemId)
    .eq("project_id", projectId);

  if (error) return { error: error.message, success: false };
  revalidatePath(`/projects/${projectId}/backlog`);
  return { error: null, success: true };
}

// dev_type's 10 values don't map 1:1 onto objects.object_type's fixed 7 --
// Fiori/Configuration/User Exit/BAdI/Function Module have no equivalent
// and fall back to Enhancement, editable afterward in the Objects
// register. See D8 in the implementation plan.
const DEV_TYPE_TO_OBJECT_TYPE: Record<string, ObjectType> = {
  Workflow: "Workflow",
  Report: "Report",
  Interface: "Interface",
  Enhancement: "Enhancement",
  Form: "Form",
};

/** Promotes an approved backlog item into a real objects row -- section 6
 * of the original Excel prompt ("Approval -> Move to Main Objects"),
 * rebuilt as a real action instead of a manual copy/paste step. */
export async function moveToObjects(itemId: string, projectId: string): Promise<SimpleActionState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  const supabase = await createClient();
  const { data: item, error: fetchError } = await supabase
    .from("backlog_items")
    .select("*")
    .eq("id", itemId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message, success: false };
  if (!item) return { error: "Backlog item not found.", success: false };
  if (item.status !== "approved") {
    return { error: "Only approved items can be moved to the objects register.", success: false };
  }

  const objectType = DEV_TYPE_TO_OBJECT_TYPE[item.dev_type ?? ""] ?? "Enhancement";

  const { data: inserted, error: insertError } = await supabase
    .from("objects")
    .insert({
      project_id: projectId,
      title: item.description,
      object_type: objectType,
      module: item.module,
      complexity: item.complexity,
      company_code: item.company_code,
      go_live_critical: item.go_live_critical,
      description: item.description,
      created_by: viewer.user.id,
      updated_by: viewer.user.id,
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message, success: false };

  const { error: updateError } = await supabase
    .from("backlog_items")
    .update({ status: "moved_to_objects", converted_object_id: inserted.id, updated_by: viewer.user.id })
    .eq("id", itemId);

  if (updateError) return { error: updateError.message, success: false };

  revalidatePath(`/projects/${projectId}/backlog`);
  revalidatePath(`/projects/${projectId}/objects`);
  return { error: null, success: true };
}

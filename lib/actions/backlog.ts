"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/get-viewer";
import { notifyBacklogApprovalRequest, notifyBacklogPmApprovalRequest } from "@/lib/email/notify-backlog";
import type { BacklogApprovalAction, BacklogItemStatus, BacklogPackage, BacklogStream, ObjectType } from "@/lib/types/database";

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

function readDays(formData: FormData, field: string): number {
  const raw = Number(formData.get(field));
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function readPackage(formData: FormData): BacklogPackage | null {
  const raw = String(formData.get("package") ?? "").trim();
  return raw ? (raw as BacklogPackage) : null;
}

function readStream(formData: FormData): BacklogStream | null {
  const raw = String(formData.get("stream") ?? "").trim();
  return raw ? (raw as BacklogStream) : null;
}

type DaysRow = { dev_days: number; fiori_days: number; func_days: number };

function sumDays(rows: DaysRow[]): number {
  return rows.reduce((sum, r) => sum + r.dev_days + r.fiori_days + r.func_days, 0);
}

/** backlog_approval_log is append-only by RLS (no UPDATE/DELETE policy) --
 * every send/decision writes exactly one row here. */
async function logApprovalEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    projectId: string;
    batchRef: string | null;
    itemIds: string[];
    action: BacklogApprovalAction;
    actorId: string;
    totalDays: number;
    note?: string | null;
  },
) {
  await supabase.from("backlog_approval_log").insert({
    project_id: params.projectId,
    batch_ref: params.batchRef,
    item_ids: params.itemIds,
    action: params.action,
    actor_id: params.actorId,
    total_days: params.totalDays,
    note: params.note ?? null,
  });
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

  const { error } = await supabase.from("backlog_items").insert({
    project_id: projectId,
    // item_no is intentionally omitted -- the backlog_items_01_set_item_no
    // trigger fills it in from the project name + sequence.
    company_code: String(formData.get("company_code") ?? "").trim() || null,
    module: String(formData.get("module") ?? "").trim() || null,
    lob: String(formData.get("lob") ?? "").trim() || null,
    dev_type: String(formData.get("dev_type") ?? "").trim() || null,
    package: readPackage(formData),
    stream: readStream(formData),
    description,
    requested_by: String(formData.get("requested_by") ?? "").trim() || null,
    complexity,
    go_live_critical: formData.get("go_live_critical") === "yes",
    dev_completed: formData.get("dev_completed") === "yes",
    dev_days: devDays,
    fiori_days: fioriDays,
    func_days: funcDays,
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

  const { error } = await supabase
    .from("backlog_items")
    .update({
      company_code: String(formData.get("company_code") ?? "").trim() || null,
      module: String(formData.get("module") ?? "").trim() || null,
      lob: String(formData.get("lob") ?? "").trim() || null,
      dev_type: String(formData.get("dev_type") ?? "").trim() || null,
      package: readPackage(formData),
      stream: readStream(formData),
      description,
      requested_by: String(formData.get("requested_by") ?? "").trim() || null,
      complexity,
      go_live_critical: formData.get("go_live_critical") === "yes",
    dev_completed: formData.get("dev_completed") === "yes",
      dev_days: devDays,
      fiori_days: fioriDays,
      func_days: funcDays,
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
 * 'sent_for_approval' and notifies the project's configured PM Approver
 * (falls back to the project PM -- see getBacklogApprover). Generates an
 * auto batch reference: a single item gets an "individual" APR-ITM-#####
 * ref, 2+ get a shared "package" PKG-##### ref. Event-driven, not a cron
 * job -- same shape as notifyTicketCreated(). This is the *internal*
 * approval step; sending an already-approved batch to the client is a
 * separate action, sendToClient() below. */
export async function sendForApproval(projectId: string, itemIds: string[]): Promise<SimpleActionState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  if (itemIds.length === 0) return { error: "Select at least one item.", success: false };

  const supabase = await createClient();
  const mode: "individual" | "package" = itemIds.length === 1 ? "individual" : "package";
  const { data: batchRef, error: refError } = await supabase.rpc("generate_approval_ref", {
    p_project_id: projectId,
    p_mode: mode,
  });
  if (refError) return { error: refError.message, success: false };

  const { data: updated, error } = await supabase
    .from("backlog_items")
    .update({
      status: "sent_for_approval",
      approval_mode: mode,
      approval_batch_ref: batchRef,
      sent_for_approval_at: new Date().toISOString(),
      updated_by: viewer.user.id,
    })
    .eq("project_id", projectId)
    .eq("status", "registered")
    .in("id", itemIds)
    .select("id, dev_days, fiori_days, func_days");

  if (error) return { error: error.message, success: false };
  const sentIds = (updated ?? []).map((r) => r.id as string);
  if (sentIds.length === 0) return { error: "None of the selected items are still Registered.", success: false };

  await logApprovalEvent(supabase, {
    projectId,
    batchRef,
    itemIds: sentIds,
    action: "sent",
    actorId: viewer.user.id,
    totalDays: sumDays(updated as DaysRow[]),
  });

  revalidatePath(`/projects/${projectId}/backlog`);
  await notifyBacklogPmApprovalRequest(projectId, sentIds, batchRef);
  return { error: null, success: true };
}

/** Sends an already-approved batch to the client for their own sign-off --
 * the original client-facing email (unchanged), now a deliberate second
 * step after internal PM approval rather than the trigger for it. Doesn't
 * change backlog_items.status; only approved items are eligible. */
export async function sendToClient(projectId: string, itemIds: string[], crNo: string): Promise<SimpleActionState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  if (itemIds.length === 0) return { error: "Select at least one item.", success: false };
  if (!crNo.trim()) return { error: "A CR number is required.", success: false };

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("backlog_items")
    .update({ cr_no: crNo.trim(), updated_by: viewer.user.id })
    .eq("project_id", projectId)
    .eq("status", "approved")
    .in("id", itemIds)
    .select("id");

  if (error) return { error: error.message, success: false };
  const eligibleIds = (updated ?? []).map((r) => r.id as string);
  if (eligibleIds.length === 0) return { error: "Only already-approved items can be sent to the client.", success: false };

  revalidatePath(`/projects/${projectId}/backlog`);
  await notifyBacklogApprovalRequest(projectId, eligibleIds, crNo.trim());
  return { error: null, success: true };
}

/** Approve/reject/hold from the register or drawer. Approving stamps
 * approval_date; the other two just move status (a rejected/on_hold item
 * can be re-sent for approval later by selecting it again). Every call
 * writes one backlog_approval_log row; an optional note on reject/hold is
 * also mirrored onto the item's own remarks for at-a-glance visibility. */
export async function updateBacklogStatus(
  itemId: string,
  projectId: string,
  status: Extract<BacklogItemStatus, "approved" | "rejected" | "on_hold" | "registered">,
  note?: string,
): Promise<SimpleActionState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  const trimmedNote = note?.trim() || null;
  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("backlog_items")
    .update({
      status,
      approval_date: status === "approved" ? new Date().toISOString().slice(0, 10) : null,
      ...(trimmedNote ? { remarks: trimmedNote } : {}),
      updated_by: viewer.user.id,
    })
    .eq("id", itemId)
    .eq("project_id", projectId)
    .select("id, approval_batch_ref, dev_days, fiori_days, func_days")
    .maybeSingle();

  if (error) return { error: error.message, success: false };
  if (!updated) return { error: "Backlog item not found.", success: false };

  if (status === "approved" || status === "rejected" || status === "on_hold") {
    await logApprovalEvent(supabase, {
      projectId,
      batchRef: updated.approval_batch_ref,
      itemIds: [itemId],
      action: status,
      actorId: viewer.user.id,
      totalDays: sumDays([updated as DaysRow]),
      note: trimmedNote,
    });
  }

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

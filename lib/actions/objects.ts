"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/auth/get-viewer";
import { notifyObjectStatusChange } from "@/lib/email/notify-status-change";
import type { AssignedRole, ObjectRow, ObjectStatus, ObjectType } from "@/lib/types/database";

const AUDITED_FIELDS: (keyof ObjectRow)[] = [
  "status",
  "title",
  "module",
  "wave",
  "priority",
  "complexity",
  "due_date",
  "fds_received",
  "admin_note",
  "comments",
  "company_code",
  "business_unit",
  "stream",
];

/** PM/admin writes go through the RLS-checked client; the audit trail write
 * uses the service role, matching section 5 ("audit_log — insert via
 * service role only"). */
async function recordAudit(
  objectId: string,
  before: ObjectRow,
  after: Partial<ObjectRow>,
  changedBy: string,
) {
  const rows = AUDITED_FIELDS.filter(
    (field) => field in after && after[field] !== before[field],
  ).map((field) => ({
    object_id: objectId,
    field,
    old_value: before[field] === null || before[field] === undefined ? null : String(before[field]),
    new_value: after[field] === null || after[field] === undefined ? null : String(after[field]),
    changed_by: changedBy,
  }));

  if (rows.length === 0) return;
  const admin = createAdminClient();
  await admin.from("audit_log").insert(rows);
}

export interface FormActionState {
  error: string | null;
}

export async function createObject(
  projectId: string,
  _prevState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  const title = String(formData.get("title") ?? "").trim();
  const objectType = String(formData.get("object_type") ?? "") as ObjectType;
  if (!title || !objectType) {
    return { error: "Title and object type are required." };
  }

  const supabase = await createClient();

  let companyCode = String(formData.get("company_code") ?? "").trim();
  let stream = String(formData.get("stream") ?? "").trim();
  if (!companyCode || !stream) {
    // Default new objects to the parent project's company code/stream so
    // every object is still tagged even if the field is left blank here.
    const { data: project } = await supabase
      .from("projects")
      .select("company_code, stream")
      .eq("id", projectId)
      .single();
    companyCode = companyCode || project?.company_code || "";
    stream = stream || project?.stream || "";
  }

  const status = String(formData.get("status") ?? "").trim();

  const { data: inserted, error } = await supabase
    .from("objects")
    .insert({
      project_id: projectId,
      title,
      object_type: objectType,
      // wricef_id is intentionally omitted — the objects_set_wricef_id
      // trigger fills it in from the project/module/object type.
      module: String(formData.get("module") ?? "").trim() || null,
      complexity: String(formData.get("complexity") ?? "").trim() || null,
      wave: String(formData.get("wave") ?? "").trim() || null,
      priority: String(formData.get("priority") ?? "").trim() || null,
      due_date: String(formData.get("due_date") ?? "").trim() || null,
      fds_received: formData.get("fds_received") === "yes",
      description: String(formData.get("description") ?? "").trim() || null,
      company_code: companyCode || null,
      business_unit: String(formData.get("business_unit") ?? "").trim().slice(0, 10) || null,
      stream: stream || null,
      // Falls back to the DB default when the org has no statuses
      // configured yet (Settings → Object statuses) — should not normally
      // happen since the dropdown is populated from that same list.
      ...(status ? { status } : {}),
      created_by: viewer.user.id,
      updated_by: viewer.user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const functionalResourceId = String(formData.get("functional_resource_id") ?? "").trim() || null;
  const technicalResourceId = String(formData.get("technical_resource_id") ?? "").trim() || null;
  if (functionalResourceId) await setObjectAssignee(inserted.id, projectId, functionalResourceId, "functional");
  if (technicalResourceId) await setObjectAssignee(inserted.id, projectId, technicalResourceId, "developer");

  revalidatePath(`/projects/${projectId}`);
  return { error: null };
}

export async function updateObjectByManager(
  objectId: string,
  projectId: string,
  patch: Partial<
    Pick<
      ObjectRow,
      | "title"
      | "module"
      | "wave"
      | "priority"
      | "complexity"
      | "due_date"
      | "status"
      | "fds_received"
      | "description"
      | "admin_note"
      | "comments"
      | "company_code"
      | "business_unit"
      | "stream"
    >
  >,
) {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  if (patch.business_unit) patch.business_unit = patch.business_unit.slice(0, 10);

  const supabase = await createClient();
  const { data: before } = await supabase.from("objects").select("*").eq("id", objectId).single();
  if (!before) return { error: "Object not found." };

  const { error } = await supabase
    .from("objects")
    .update({ ...patch, updated_by: viewer.user.id })
    .eq("id", objectId);

  if (error) return { error: error.message };

  await recordAudit(objectId, before as ObjectRow, patch, viewer.user.id);
  if (patch.status && patch.status !== (before as ObjectRow).status) {
    await notifyObjectStatusChange(objectId, projectId, patch.status, (before as ObjectRow).status);
  }
  revalidatePath(`/projects/${projectId}`);
  return { error: null };
}

/** Replaces the single functional/technical assignee on an object — used by
 * the Assignments tab and object detail drawer, which model one Functional
 * Consultant and one Technical Consultant per object even though
 * object_assignments technically allows several per role. Assignment
 * points at the resource roster, not a login — a resource can be assigned
 * before it's ever invited (see migration 0013). */
export async function setObjectAssignee(
  objectId: string,
  projectId: string,
  resourceId: string | null,
  role: AssignedRole,
) {
  const supabase = await createClient();

  await supabase.from("object_assignments").delete().eq("object_id", objectId).eq("assigned_role", role);

  if (resourceId) {
    const { error } = await supabase
      .from("object_assignments")
      .insert({ object_id: objectId, resource_id: resourceId, assigned_role: role });
    if (error) return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  return { error: null };
}

/** Member self-service update — routes through the member_update_object()
 * RPC so only status/admin_note/comments/comments2 on assigned objects can
 * change, per section 5. */
export async function memberUpdateObject(
  objectId: string,
  patch: { status?: ObjectStatus; admin_note?: string; comments?: string; comments2?: string },
) {
  const supabase = await createClient();

  let before: Pick<ObjectRow, "status" | "project_id"> | null = null;
  if (patch.status) {
    const { data } = await supabase.from("objects").select("status, project_id").eq("id", objectId).maybeSingle();
    before = data;
  }

  const { error } = await supabase.rpc("member_update_object", {
    p_object_id: objectId,
    p_status: patch.status ?? null,
    p_admin_note: patch.admin_note ?? null,
    p_comments: patch.comments ?? null,
    p_comments2: patch.comments2 ?? null,
  });

  if (error) return { error: error.message };
  if (patch.status && before && patch.status !== before.status) {
    await notifyObjectStatusChange(objectId, before.project_id, patch.status, before.status);
  }
  revalidatePath("/my-work");
  return { error: null };
}

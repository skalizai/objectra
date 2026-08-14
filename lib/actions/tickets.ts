"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/auth/get-viewer";
import { notifyTicketCreated, notifyTicketStatusChange, notifyTicketAssignment } from "@/lib/email/notify-ticket";
import { getTicketComments, getTicketEvents } from "@/lib/data/support";
import type { Ticket, TicketCategory, TicketCriticality, TicketStatus } from "@/lib/types/database";

const BUCKET = "ticket-attachments";

export interface CreateTicketState {
  error: string | null;
  ticketNo?: string | null;
  assignedToName?: string | null;
}

/** Uploads one file to a draft-scoped "pending" path — the ticket doesn't
 * exist yet at the point the raise-ticket form lets someone attach a file.
 * createTicket() moves these under the ticket's own id once it's created. */
export async function uploadTicketAttachment(
  projectId: string,
  draftId: string,
  formData: FormData,
): Promise<{ path: string | null; error: string | null }> {
  const viewer = await getViewer();
  if (!viewer) return { path: null, error: "Not signed in." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { path: null, error: "Choose a file first." };
  }

  const supabase = await createClient();
  const path = `${projectId}/pending/${draftId}/${file.name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) return { path: null, error: error.message };

  return { path, error: null };
}

export async function createTicket(
  projectId: string,
  _prevState: CreateTicketState,
  formData: FormData,
): Promise<CreateTicketState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  const ticketModule = String(formData.get("module") ?? "").trim();
  const criticality = String(formData.get("criticality") ?? "") as TicketCriticality;
  const subject = String(formData.get("subject") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = (String(formData.get("category") ?? "incident") || "incident") as TicketCategory;
  const relatedObjectId = String(formData.get("related_object_id") ?? "").trim() || null;
  const draftId = String(formData.get("draft_id") ?? "").trim();
  const pendingPaths = formData.getAll("pending_path").map(String).filter(Boolean);

  if (!ticketModule || !criticality || !subject) {
    return { error: "Module, criticality, and subject are required." };
  }

  const supabase = await createClient();

  // The UI already hides "Raise ticket" unless the project is in
  // hypercare/support, but a stale page (drawer left open across a phase
  // change, a second tab, etc.) can still reach this action — check here
  // too so that case gets a clear message instead of the tickets_insert
  // RLS policy's raw "row violates row-level security policy" error.
  const { data: project } = await supabase.from("projects").select("phase").eq("id", projectId).maybeSingle();
  if (project && project.phase !== "hypercare" && project.phase !== "support") {
    return { error: "Tickets can't be raised while this project is in Implementation phase — ask your PM to switch it to Hypercare or Support first." };
  }

  // raised_by/ticket_no/assigned_to/status/sla_due_at are all set by the
  // tickets_01_set_ticket_no / tickets_02_auto_route triggers — never
  // supplied by the client.
  const { data: inserted, error } = await supabase
    .from("tickets")
    .insert({
      project_id: projectId,
      module: ticketModule,
      criticality,
      subject,
      description: description || null,
      category,
      related_object_id: relatedObjectId,
    })
    .select("*")
    .single();

  if (error) {
    // Safety net for any other RLS path this didn't already catch (e.g. the
    // caller's project role changed since the page loaded) — never surface
    // raw Postgres/PostgREST error text to the user.
    if (error.message.toLowerCase().includes("row-level security")) {
      return { error: "You don't have permission to raise a ticket on this project right now." };
    }
    return { error: error.message };
  }
  const ticket = inserted as Ticket;

  if (pendingPaths.length > 0) {
    const admin = createAdminClient();
    const finalPaths: string[] = [];
    for (const pendingPath of pendingPaths) {
      const filename = pendingPath.split("/").pop() ?? "file";
      const finalPath = `${projectId}/${ticket.id}/${filename}`;
      const { error: moveError } = await admin.storage.from(BUCKET).move(pendingPath, finalPath);
      if (!moveError) finalPaths.push(finalPath);
    }
    if (finalPaths.length > 0) {
      await supabase.from("tickets").update({ attachment_paths: finalPaths }).eq("id", ticket.id);
    }
  }
  void draftId; // draft_id only scopes the pending storage path client-side

  await notifyTicketCreated(ticket.id);

  revalidatePath(`/projects/${projectId}/support`);
  revalidatePath("/my-tickets");

  return {
    error: null,
    ticketNo: ticket.ticket_no,
    assignedToName: null, // resolved client-side from the toast context if needed
  };
}

export interface SimpleActionState {
  error: string | null;
  success: boolean;
}

export async function addTicketComment(
  ticketId: string,
  isInternal: boolean,
  _prevState: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Comment can't be empty.", success: false };

  const supabase = await createClient();
  // is_internal is force-corrected server-side by the ticket_comments_guard
  // trigger for anyone who isn't editor/admin/assignee — safe to pass the
  // caller's intent through as-is.
  const { data: ticket } = await supabase.from("tickets").select("project_id").eq("id", ticketId).maybeSingle();
  const { error } = await supabase.from("ticket_comments").insert({ ticket_id: ticketId, body, is_internal: isInternal });
  if (error) return { error: error.message, success: false };

  if (ticket) revalidatePath(`/projects/${ticket.project_id}/support`);
  return { error: null, success: true };
}

/** The assigned consultant may update only status/resolution_note/effort_hours
 * — routed through the consultant_update_ticket() RPC (column-guarded),
 * same idiom as member_update_object() for objects. */
export async function consultantUpdateTicket(
  ticketId: string,
  patch: { status?: TicketStatus; resolution_note?: string; effort_hours?: number },
) {
  const supabase = await createClient();

  const { data: before } = await supabase.from("tickets").select("status, project_id").eq("id", ticketId).maybeSingle();

  const { error } = await supabase.rpc("consultant_update_ticket", {
    p_ticket_id: ticketId,
    p_status: patch.status ?? null,
    p_resolution_note: patch.resolution_note ?? null,
    p_effort_hours: patch.effort_hours ?? null,
  });

  if (error) return { error: error.message };

  if (patch.status && before && patch.status !== before.status) {
    await notifyTicketStatusChange(ticketId, before.status, patch.status);
  }
  if (before) revalidatePath(`/projects/${before.project_id}/support`);
  revalidatePath("/my-work");
  return { error: null };
}

/** The raiser may only act on a resolved ticket — accept the fix (close)
 * or reopen it (requires a comment). Routed through
 * raiser_close_or_reopen_ticket() (SECURITY DEFINER RPC). */
export async function raiserCloseOrReopenTicket(
  ticketId: string,
  action: "close" | "reopen",
  comment?: string,
) {
  const supabase = await createClient();

  const { data: before } = await supabase.from("tickets").select("project_id").eq("id", ticketId).maybeSingle();

  const { error } = await supabase.rpc("raiser_close_or_reopen_ticket", {
    p_ticket_id: ticketId,
    p_action: action,
    p_comment: comment ?? null,
  });

  if (error) return { error: error.message };

  await notifyTicketStatusChange(ticketId, "resolved", action === "close" ? "closed" : "reopened");
  if (before) revalidatePath(`/projects/${before.project_id}/support`);
  revalidatePath("/my-tickets");
  return { error: null };
}

/** PM/technical_lead/org_admin only, per the tickets_update RLS policy —
 * reassign to a different consultant. The picker offers the full org
 * resource roster (not just already-invited project members, same as
 * ticket routing — section 24), but tickets.assigned_to still has to be a
 * profiles id (someone who can actually log in and work it), so this
 * resolves resourceId -> resources.profile_id itself and returns a plain
 * message instead of silently no-oping if that resource hasn't accepted
 * their invite yet. */
export async function reassignTicket(ticketId: string, projectId: string, resourceId: string) {
  const supabase = await createClient();

  const { data: resource } = await supabase
    .from("resources")
    .select("full_name, profile_id")
    .eq("id", resourceId)
    .maybeSingle();
  if (!resource) return { error: "Resource not found." };
  if (!resource.profile_id) {
    return { error: `${resource.full_name} hasn't accepted their invite yet — invite them from Resources first, then you can reassign to them.` };
  }

  const { error } = await supabase.from("tickets").update({ assigned_to: resource.profile_id }).eq("id", ticketId);
  if (error) return { error: error.message };

  await notifyTicketAssignment(ticketId);
  revalidatePath(`/projects/${projectId}/support`);
  return { error: null };
}

/** PM/technical_lead/org_admin only, per the new tickets_delete RLS policy
 * (0033) — tickets had no DELETE policy at all before, so this was
 * previously impossible for anyone. Comments/events cascade automatically
 * (both reference ticket_id on delete cascade). */
export async function deleteTicket(ticketId: string, projectId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tickets").delete().eq("id", ticketId);
  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}/support`);
  revalidatePath("/my-tickets");
  revalidatePath("/my-work");
  return { error: null };
}

/** PM/technical_lead only, per the tickets_update RLS policy. Recomputing
 * sla_due_at when criticality changes is left to a future enhancement — the
 * original due date stands, matching how the base object pipeline doesn't
 * retroactively move due dates on a field edit either. */
export async function updateTicketCriticality(ticketId: string, projectId: string, criticality: TicketCriticality) {
  const supabase = await createClient();
  const { error } = await supabase.from("tickets").update({ criticality }).eq("id", ticketId);
  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}/support`);
  return { error: null };
}

/** PM/technical_lead/org_admin updating status/resolution/effort on a
 * ticket they aren't personally assigned to — goes through the plain
 * RLS-checked update (tickets_update already grants editors full write),
 * unlike consultantUpdateTicket() which is restricted to the assignee via
 * the assigned_to = auth.uid() check inside the RPC. */
export async function managerUpdateTicket(
  ticketId: string,
  projectId: string,
  patch: { status?: TicketStatus; resolution_note?: string; effort_hours?: number },
) {
  const supabase = await createClient();
  const { data: before } = await supabase.from("tickets").select("status").eq("id", ticketId).maybeSingle();

  const { error } = await supabase.from("tickets").update(patch).eq("id", ticketId);
  if (error) return { error: error.message };

  if (patch.status && before && patch.status !== before.status) {
    await notifyTicketStatusChange(ticketId, before.status, patch.status);
  }
  revalidatePath(`/projects/${projectId}/support`);
  return { error: null };
}

export async function loadTicketDetail(ticketId: string) {
  const [comments, events] = await Promise.all([getTicketComments(ticketId), getTicketEvents(ticketId)]);
  return { comments, events };
}

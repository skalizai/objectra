import { createAdminClient } from "@/lib/supabase/admin";
import { postTeamsCard } from "@/lib/teams/post-card";
import { ticketAssignedCard, ticketCreatedCard, ticketStatusCard, slaBreachCard } from "@/lib/teams/cards";
import type { Ticket, TeamsConnection } from "@/lib/types/database";

type Admin = ReturnType<typeof createAdminClient>;

async function getContext(admin: Admin, ticketId: string) {
  const { data: ticketRow } = await admin.from("tickets").select("*").eq("id", ticketId).maybeSingle();
  if (!ticketRow) return null;
  const ticket = ticketRow as Ticket;

  const { data } = await admin.from("teams_connections").select("*").eq("project_id", ticket.project_id).maybeSingle();
  const connection = data as TeamsConnection | null;
  if (!connection || !connection.is_active) return null;

  let assigneeName: string | null = null;
  if (ticket.assigned_to) {
    const { data: profile } = await admin.from("profiles").select("full_name").eq("id", ticket.assigned_to).maybeSingle();
    assigneeName = profile?.full_name ?? null;
  }

  return { ticket, connection, assigneeName };
}

/** Fires alongside notifyTicketCreated() -- gated by notify_created. */
export async function notifyTeamsTicketCreated(ticketId: string) {
  const admin = createAdminClient();
  const ctx = await getContext(admin, ticketId);
  if (!ctx || !ctx.connection.notify_created) return;

  await postTeamsCard(ctx.ticket.project_id, ticketCreatedCard(ctx.ticket, ctx.assigneeName), "ticket_created");
}

/** Fires on auto-routing and manual reassignment -- treated as a lifecycle
 * event under notify_status (the addendum's data model has only three
 * toggles: created / status / sla, so assignment shares status's gate). */
export async function notifyTeamsTicketAssignment(ticketId: string) {
  const admin = createAdminClient();
  const ctx = await getContext(admin, ticketId);
  if (!ctx || !ctx.connection.notify_status || !ctx.ticket.assigned_to) return;

  await postTeamsCard(ctx.ticket.project_id, ticketAssignedCard(ctx.ticket, ctx.assigneeName), "ticket_assigned");
}

export async function notifyTeamsTicketStatusChange(ticketId: string, previousStatus: string, newStatus: string) {
  const admin = createAdminClient();
  const ctx = await getContext(admin, ticketId);
  if (!ctx || !ctx.connection.notify_status) return;

  await postTeamsCard(ctx.ticket.project_id, ticketStatusCard(ctx.ticket, previousStatus, newStatus), "ticket_status");
}

/** Called by the sla-scan job for a fresh breach only (not warnings, per
 * the addendum's outbound event list). */
export async function notifyTeamsSlaBreach(ticketId: string) {
  const admin = createAdminClient();
  const ctx = await getContext(admin, ticketId);
  if (!ctx || !ctx.connection.notify_sla) return;

  await postTeamsCard(ctx.ticket.project_id, slaBreachCard(ctx.ticket, ctx.assigneeName), "sla_breach");
}

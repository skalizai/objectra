import { createAdminClient } from "@/lib/supabase/admin";
import { notifySlaAlert } from "@/lib/email/notify-ticket";
import type { Ticket } from "@/lib/types/database";

export interface SlaScanResult {
  ticketsScanned: number;
  breachesFlagged: number;
  warningsFlagged: number;
}

/** Runs daily (section 18 specs every 30 min, but this project is on
 * Vercel's Hobby plan, which only allows daily cron schedules — see
 * vercel.json; revisit if/when upgraded to Pro): flags tickets past
 * sla_due_at as breached, and tickets within 25% of their remaining SLA
 * window as "due soon". Idempotent by design — sla_breach_alerted_at /
 * sla_warning_alerted_at (set here, cleared by raiser_close_or_reopen_ticket
 * on reopen and recomputed by tickets_auto_route on create) mean a given
 * breach/warning episode is only ever alerted once. */
export async function runSlaScan(options?: { projectId?: string }): Promise<SlaScanResult> {
  const supabase = createAdminClient();
  const result: SlaScanResult = { ticketsScanned: 0, breachesFlagged: 0, warningsFlagged: 0 };

  let query = supabase
    .from("tickets")
    .select("*")
    .not("status", "in", "(resolved,closed)")
    .not("sla_due_at", "is", null)
    .or("sla_breach_alerted_at.is.null,sla_warning_alerted_at.is.null");
  if (options?.projectId) query = query.eq("project_id", options.projectId);

  const { data: tickets } = await query;
  const now = Date.now();

  for (const ticket of (tickets ?? []) as Ticket[]) {
    result.ticketsScanned += 1;

    const due = new Date(ticket.sla_due_at!).getTime();
    const created = new Date(ticket.created_at).getTime();
    const remaining = due - now;
    const totalWindow = due - created;

    if (remaining <= 0 && !ticket.sla_breach_alerted_at) {
      await supabase
        .from("tickets")
        .update({ sla_breached: true, sla_breach_alerted_at: new Date().toISOString() })
        .eq("id", ticket.id);
      await notifySlaAlert(ticket.id, false);
      result.breachesFlagged += 1;
      continue;
    }

    if (remaining > 0 && totalWindow > 0 && remaining <= totalWindow * 0.25 && !ticket.sla_warning_alerted_at) {
      await supabase
        .from("tickets")
        .update({ sla_warning_alerted_at: new Date().toISOString() })
        .eq("id", ticket.id);
      await notifySlaAlert(ticket.id, true);
      result.warningsFlagged += 1;
    }
  }

  return result;
}

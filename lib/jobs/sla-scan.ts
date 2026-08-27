import { createAdminClient } from "@/lib/supabase/admin";
import { notifySlaAlert, notifySlaEscalation } from "@/lib/email/notify-ticket";
import { notifyTeamsSlaBreach } from "@/lib/teams/notify-teams";
import type { SlaEscalationTier, SlaEscalationTierName, Ticket } from "@/lib/types/database";

export interface SlaScanResult {
  ticketsScanned: number;
  breachesFlagged: number;
  warningsFlagged: number;
  escalationsSent: number;
}

const ESCALATION_COLUMN: Record<SlaEscalationTierName, "sl1_alerted_at" | "sl2_alerted_at" | "sl3_alerted_at"> = {
  SL1: "sl1_alerted_at",
  SL2: "sl2_alerted_at",
  SL3: "sl3_alerted_at",
};

/** Runs daily (section 18 specs every 30 min, but this project is on
 * Vercel's Hobby plan, which only allows daily cron schedules — see
 * vercel.json; revisit if/when upgraded to Pro). Two independent checks:
 *  1. Per-criticality SLA: flags tickets past sla_due_at as breached, and
 *     tickets within 25% of their remaining window as "due soon".
 *  2. Escalation ladder (SL1/SL2/SL3, section 23): flat "still open after
 *     N minutes" thresholds per project, each rung emailing its own
 *     recipient list.
 * Idempotent by design in both — sla_breach_alerted_at/sla_warning_alerted_at
 * and sl1/sl2/sl3_alerted_at (set here, cleared by
 * raiser_close_or_reopen_ticket on reopen, the SLA ones recomputed by
 * tickets_auto_route on create) mean a given episode is only ever alerted
 * once. */
export async function runSlaScan(options?: { projectId?: string }): Promise<SlaScanResult> {
  const supabase = createAdminClient();
  const result: SlaScanResult = { ticketsScanned: 0, breachesFlagged: 0, warningsFlagged: 0, escalationsSent: 0 };

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
      await notifyTeamsSlaBreach(ticket.id);
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

  // --- Escalation ladder (SL1/SL2/SL3) — independent of the
  // per-criticality due dates above: a flat "still open after N minutes"
  // threshold per project, each rung with its own recipient list. ---
  let tierQuery = supabase.from("sla_escalation_tiers").select("*");
  if (options?.projectId) tierQuery = tierQuery.eq("project_id", options.projectId);
  const { data: tierRows } = await tierQuery;
  const tiers = (tierRows ?? []) as SlaEscalationTier[];

  if (tiers.length > 0) {
    const { data: recipientRows } = await supabase
      .from("sla_escalation_recipients")
      .select("tier_id, resource:resources(email)")
      .in(
        "tier_id",
        tiers.map((t) => t.id),
      );
    const emailsByTier = new Map<string, string[]>();
    for (const r of (recipientRows ?? []) as unknown as { tier_id: string; resource: { email: string } | null }[]) {
      if (!r.resource?.email) continue;
      const list = emailsByTier.get(r.tier_id) ?? [];
      list.push(r.resource.email);
      emailsByTier.set(r.tier_id, list);
    }

    const tiersByProject = new Map<string, SlaEscalationTier[]>();
    for (const t of tiers) {
      const list = tiersByProject.get(t.project_id) ?? [];
      list.push(t);
      tiersByProject.set(t.project_id, list);
    }

    const projectIds = Array.from(tiersByProject.keys());
    const { data: openTicketRows } = await supabase
      .from("tickets")
      .select("*")
      .not("status", "in", "(resolved,closed)")
      .in("project_id", projectIds);

    for (const ticket of (openTicketRows ?? []) as Ticket[]) {
      const projectTiers = tiersByProject.get(ticket.project_id) ?? [];
      const ageMins = (now - new Date(ticket.created_at).getTime()) / 60000;

      for (const tier of projectTiers) {
        const column = ESCALATION_COLUMN[tier.tier];
        if (ticket[column]) continue; // already escalated this episode
        if (ageMins < tier.threshold_mins) continue;

        const emails = emailsByTier.get(tier.id) ?? [];
        if (emails.length === 0) continue;

        await supabase
          .from("tickets")
          .update({ [column]: new Date().toISOString() })
          .eq("id", ticket.id);
        await notifySlaEscalation(ticket.id, tier.tier, emails);
        result.escalationsSent += 1;
      }
    }
  }

  return result;
}

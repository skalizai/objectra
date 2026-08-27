import { CRITICALITY_COLOR, CRITICALITY_LABEL } from "@/emails/components/criticality";
import type { Ticket } from "@/lib/types/database";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export type AdaptiveCard = Record<string, unknown>;

function ticketUrl(projectId: string, ticketNo: string | null) {
  const url = `${APP_URL}/projects/${projectId}/support`;
  return ticketNo ? `${url}?ticket=${encodeURIComponent(ticketNo)}` : url;
}

function fact(title: string, value: string) {
  return { title, value };
}

/** Adaptive Card v1.4 -- title row with the ticket number in a monospace
 * TextBlock, a facts set, and an "Open in Objectra" action. Kept as plain
 * JSON builders (not React) so Tier B (a real Bot Framework app) can reuse
 * them verbatim -- see lib/teams -- built for Tier A's fire-and-forget
 * webhook posts. */
function ticketCard(
  headline: string,
  ticket: Pick<Ticket, "ticket_no" | "module" | "criticality" | "subject" | "project_id" | "sla_due_at">,
  facts: { title: string; value: string }[],
): AdaptiveCard {
  const color = CRITICALITY_COLOR[ticket.criticality] ?? "#7A8492";
  return {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.4",
    body: [
      {
        type: "TextBlock",
        text: headline,
        weight: "Bolder",
        size: "Medium",
        wrap: true,
      },
      {
        type: "TextBlock",
        text: ticket.ticket_no ?? "—",
        fontType: "Monospace",
        weight: "Bolder",
        color: "Accent",
        spacing: "Small",
      },
      {
        type: "TextBlock",
        text: ticket.subject,
        wrap: true,
        spacing: "Small",
      },
      {
        type: "FactSet",
        spacing: "Medium",
        facts: [
          fact("Module", ticket.module),
          fact("Criticality", CRITICALITY_LABEL[ticket.criticality] ?? ticket.criticality),
          ...facts,
        ],
      },
    ],
    actions: [
      {
        type: "Action.OpenUrl",
        title: "Open in Objectra",
        url: ticketUrl(ticket.project_id, ticket.ticket_no),
      },
    ],
    msteams: { width: "Full" },
    // Not read by the renderer -- carried through so the card JSON alone
    // documents which criticality color it was built for (useful in logs).
    _color: color,
  };
}

export function ticketCreatedCard(
  ticket: Pick<Ticket, "ticket_no" | "module" | "criticality" | "subject" | "project_id" | "sla_due_at">,
  assigneeName: string | null,
): AdaptiveCard {
  return ticketCard("New ticket", ticket, [
    fact("Assignee", assigneeName ?? "Unassigned"),
    fact("SLA due", ticket.sla_due_at ? new Date(ticket.sla_due_at).toLocaleString() : "—"),
  ]);
}

export function ticketAssignedCard(
  ticket: Pick<Ticket, "ticket_no" | "module" | "criticality" | "subject" | "project_id" | "sla_due_at">,
  assigneeName: string | null,
): AdaptiveCard {
  return ticketCard("Ticket reassigned", ticket, [
    fact("Assignee", assigneeName ?? "Unassigned"),
    fact("SLA due", ticket.sla_due_at ? new Date(ticket.sla_due_at).toLocaleString() : "—"),
  ]);
}

export function ticketStatusCard(
  ticket: Pick<Ticket, "ticket_no" | "module" | "criticality" | "subject" | "project_id" | "sla_due_at">,
  previousStatus: string,
  newStatus: string,
): AdaptiveCard {
  return ticketCard(`Status: ${previousStatus.replace(/_/g, " ")} → ${newStatus.replace(/_/g, " ")}`, ticket, [
    fact("Status", newStatus.replace(/_/g, " ")),
  ]);
}

export function slaBreachCard(
  ticket: Pick<Ticket, "ticket_no" | "module" | "criticality" | "subject" | "project_id" | "sla_due_at">,
  assigneeName: string | null,
): AdaptiveCard {
  return ticketCard("SLA breached", ticket, [
    fact("Assignee", assigneeName ?? "Unassigned"),
    fact("Was due", ticket.sla_due_at ? new Date(ticket.sla_due_at).toLocaleString() : "—"),
  ]);
}

export function testCard(): AdaptiveCard {
  return {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.4",
    body: [
      { type: "TextBlock", text: "Objectra test card", weight: "Bolder", size: "Medium" },
      { type: "TextBlock", text: "If you can see this, the connection is working.", wrap: true, spacing: "Small" },
    ],
    msteams: { width: "Full" },
  };
}

/** Reply body for a valid "ticket" command -- Outgoing Webhooks render
 * their reply from the HTTP response of the same request, not a second
 * POST, so this is returned directly rather than sent via postTeamsCard. */
export function ticketConfirmationCard(
  ticket: Pick<Ticket, "ticket_no" | "module" | "criticality" | "subject" | "project_id" | "sla_due_at">,
  assigneeName: string | null,
): AdaptiveCard {
  return ticketCard("Ticket created", ticket, [
    fact("Assignee", assigneeName ?? "Unassigned"),
    fact("SLA due", ticket.sla_due_at ? new Date(ticket.sla_due_at).toLocaleString() : "—"),
  ]);
}

export function statusReplyCard(
  ticket: Pick<Ticket, "ticket_no" | "module" | "criticality" | "subject" | "project_id" | "sla_due_at"> & { status: string },
  assigneeName: string | null,
): AdaptiveCard {
  return ticketCard(`Status: ${ticket.status.replace(/_/g, " ")}`, ticket, [
    fact("Assignee", assigneeName ?? "Unassigned"),
    fact("SLA due", ticket.sla_due_at ? new Date(ticket.sla_due_at).toLocaleString() : "—"),
  ]);
}

export function usageCard(validModules: string[]): AdaptiveCard {
  return {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.4",
    body: [
      { type: "TextBlock", text: "Objectra bot commands", weight: "Bolder", size: "Medium" },
      {
        type: "TextBlock",
        wrap: true,
        spacing: "Small",
        text:
          "`@Objectra ticket <module> <p1|p2|p3|p4> <subject>` — create a ticket\n\n" +
          "`@Objectra status <ticket_no>` — check a ticket's status\n\n" +
          (validModules.length > 0 ? `Valid modules for this project: ${validModules.join(", ")}` : ""),
      },
    ],
    msteams: { width: "Full" },
  };
}

export function rejectionCard(message: string): AdaptiveCard {
  return {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.4",
    body: [
      { type: "TextBlock", text: "Couldn't create that ticket", weight: "Bolder", size: "Medium", color: "Attention" },
      { type: "TextBlock", text: message, wrap: true, spacing: "Small" },
    ],
    msteams: { width: "Full" },
  };
}

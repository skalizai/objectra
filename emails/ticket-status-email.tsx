import { EmailShellV2, StatusBadge, V2 } from "./components/shell-v2";

export interface TicketStatusEmailProps {
  recipientName: string;
  ticketNo: string;
  subject: string;
  projectName: string;
  previousStatus: string;
  newStatus: string;
  statusColor: string;
  appUrl: string;
}

const FONT = "Helvetica, Arial, sans-serif";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  assigned: "Assigned",
  in_progress: "In progress",
  pending_user: "Pending your input",
  resolved: "Resolved",
  closed: "Closed",
  reopened: "Reopened",
};

/** External-safe by construction: only ticket_no/subject/status/project
 * name are ever passed in here — no resolution_note or internal comment
 * text, so there's nothing to accidentally leak to a raiser who might not
 * be a consultant/PM. */
export default function TicketStatusEmail({
  recipientName = "there",
  ticketNo = "ACME-INC-00001",
  subject = "Unable to post goods receipt",
  projectName = "Acme S/4HANA Rollout",
  previousStatus = "in_progress",
  newStatus = "resolved",
  statusColor = "#35C08A",
  appUrl = "https://objectra.app",
}: TicketStatusEmailProps) {
  const newLabel = STATUS_LABEL[newStatus] ?? newStatus;
  const prevLabel = STATUS_LABEL[previousStatus] ?? previousStatus;

  return (
    <EmailShellV2 preview={`${ticketNo} is now ${newLabel} — ${subject}`} badge="Ticket Update" appUrl={appUrl}>
      <table role="presentation" cellPadding={0} cellSpacing={0} border={0}>
        <tr>
          <td style={{ fontFamily: FONT, fontSize: 13, color: V2.muted, lineHeight: "24px", textDecoration: "line-through" }}>
            {prevLabel}
          </td>
          <td style={{ fontFamily: FONT, fontSize: 14, color: V2.goldDark, padding: "0 10px", lineHeight: "24px" }}>→</td>
          <td><StatusBadge label={newLabel} color={statusColor} /></td>
        </tr>
      </table>

      <div className="darktext" style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: V2.heading, lineHeight: "36px", paddingTop: 18 }}>
        Your ticket is now {newLabel.toLowerCase()}
      </div>
      <div style={{ fontFamily: FONT, fontSize: 15, color: V2.body, lineHeight: "24px", paddingTop: 12 }}>
        Hi {recipientName} — {ticketNo} ({subject}) on {projectName} moved to {newLabel.toLowerCase()}.
        {newStatus === "resolved" && " If this fixed it, no action needed — otherwise you can reopen it from the ticket."}
      </div>

      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr><td height={30} style={{ fontSize: 1, lineHeight: "1px" }}>&nbsp;</td></tr>
      </table>

      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr>
          <td align="center" style={{ backgroundColor: V2.goldDark, borderRadius: 10 }}>
            <a
              href={`${appUrl}/my-tickets`}
              style={{ display: "block", padding: "14px 24px", fontFamily: FONT, fontSize: 15, fontWeight: 700, color: V2.headerBg, textDecoration: "none", lineHeight: "20px" }}
            >
              View ticket in Objectra Labs &nbsp;&nbsp;→
            </a>
          </td>
        </tr>
      </table>
    </EmailShellV2>
  );
}

import { EmailShellV2, StatusBadge, V2 } from "./components/shell-v2";
import { CRITICALITY_COLOR, CRITICALITY_LABEL } from "./components/criticality";

export interface TicketCreatedEmailProps {
  recipientName: string;
  ticketNo: string;
  subject: string;
  module: string;
  criticality: string;
  projectName: string;
  assignedToName: string | null;
  appUrl: string;
}

const FONT = "Helvetica, Arial, sans-serif";

function DetailRow({ label, value, first = false }: { label: string; value: React.ReactNode; first?: boolean }) {
  return (
    <tr>
      <td
        width={150}
        style={{ fontFamily: FONT, fontSize: 13, color: V2.muted, padding: "6px 0", lineHeight: "19px", borderTop: first ? "none" : `1px solid ${V2.borderLight}` }}
      >
        {label}
      </td>
      <td
        className="darktext"
        style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: "#2c2820", padding: "6px 0", lineHeight: "19px", borderTop: first ? "none" : `1px solid ${V2.borderLight}` }}
      >
        {value}
      </td>
    </tr>
  );
}

export default function TicketCreatedEmail({
  recipientName = "there",
  ticketNo = "ACME-INC-00001",
  subject = "Unable to post goods receipt",
  module = "MM",
  criticality = "P2_high",
  projectName = "Acme S/4HANA Rollout",
  assignedToName = "Jordan Lee",
  appUrl = "https://objectra.app",
}: TicketCreatedEmailProps) {
  const color = CRITICALITY_COLOR[criticality] ?? V2.muted;
  const label = CRITICALITY_LABEL[criticality] ?? criticality;

  return (
    <EmailShellV2 preview={`${ticketNo} received — ${subject}`} badge="Ticket Received" appUrl={appUrl}>
      <div className="darktext" style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: V2.heading, lineHeight: "36px" }}>
        We&apos;ve got your ticket
      </div>
      <div style={{ fontFamily: FONT, fontSize: 15, color: V2.body, lineHeight: "24px", paddingTop: 12 }}>
        Hi {recipientName} — your incident has been logged and{" "}
        {assignedToName ? <>routed to <strong>{assignedToName}</strong></> : "is awaiting routing"}.
      </div>

      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr><td height={26} style={{ fontSize: 1, lineHeight: "1px" }}>&nbsp;</td></tr>
      </table>

      <table
        role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%"
        style={{ border: `1px solid ${V2.border}`, borderLeft: `4px solid ${color}`, borderRadius: 10 }}
      >
        <tr>
          <td style={{ padding: "22px 24px 8px 24px" }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" as const, color: V2.goldDark, lineHeight: "16px" }}>
              {ticketNo}
            </div>
            <div className="darktext" style={{ fontFamily: FONT, fontSize: 19, fontWeight: 700, color: V2.heading, lineHeight: "26px", paddingTop: 6 }}>
              {subject}
            </div>
          </td>
        </tr>
        <tr>
          <td style={{ padding: "8px 24px 22px 24px" }}>
            <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
              <DetailRow label="Project" value={projectName} first />
              <DetailRow label="Module" value={module} />
              <DetailRow label="Criticality" value={<StatusBadge label={label} color={color} />} />
              <DetailRow label="Assigned to" value={assignedToName ?? "Awaiting routing"} />
            </table>
          </td>
        </tr>
      </table>

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

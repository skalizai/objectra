import { format } from "date-fns";
import { EmailShellV2, StatusBadge, V2 } from "./components/shell-v2";
import { CRITICALITY_COLOR, CRITICALITY_LABEL } from "./components/criticality";

export interface SlaAlertEmailProps {
  recipientName: string;
  ticketNo: string;
  subject: string;
  projectName: string;
  criticality: string;
  slaDueAt: string;
  isWarning: boolean;
  appUrl: string;
}

const FONT = "Helvetica, Arial, sans-serif";
const BREACH_RED = "#F0574B";

export default function SlaAlertEmail({
  recipientName = "there",
  ticketNo = "ACME-INC-00001",
  subject = "Unable to post goods receipt",
  projectName = "Acme S/4HANA Rollout",
  criticality = "P1_critical",
  slaDueAt = new Date().toISOString(),
  isWarning = false,
  appUrl = "https://objectra.app",
}: SlaAlertEmailProps) {
  const critColor = CRITICALITY_COLOR[criticality] ?? V2.muted;
  const critLabel = CRITICALITY_LABEL[criticality] ?? criticality;
  const headline = isWarning ? "SLA due soon" : "SLA breached";

  return (
    <EmailShellV2
      preview={`${headline}: ${ticketNo} — ${subject}`}
      badge={isWarning ? "SLA Warning" : "SLA Breach"}
      appUrl={appUrl}
    >
      <StatusBadge label={headline} color={isWarning ? critColor : BREACH_RED} />

      <div className="darktext" style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: V2.heading, lineHeight: "36px", paddingTop: 14 }}>
        {isWarning ? "This ticket is close to its SLA" : "This ticket has breached its SLA"}
      </div>
      <div style={{ fontFamily: FONT, fontSize: 15, color: V2.body, lineHeight: "24px", paddingTop: 12 }}>
        Hi {recipientName} — {ticketNo} ({subject}) on {projectName} was due{" "}
        {format(new Date(slaDueAt), "EEE, MMM d yyyy 'at' h:mm a")}
        {isWarning ? "." : " and hasn't been resolved yet."}
      </div>

      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr><td height={26} style={{ fontSize: 1, lineHeight: "1px" }}>&nbsp;</td></tr>
      </table>

      <table
        role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%"
        style={{ border: `1px solid ${V2.border}`, borderLeft: `4px solid ${isWarning ? critColor : BREACH_RED}`, borderRadius: 10 }}
      >
        <tr>
          <td style={{ padding: "22px 24px" }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" as const, color: V2.goldDark, lineHeight: "16px" }}>
              {ticketNo} · {critLabel}
            </div>
            <div className="darktext" style={{ fontFamily: FONT, fontSize: 19, fontWeight: 700, color: V2.heading, lineHeight: "26px", paddingTop: 6 }}>
              {subject}
            </div>
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
              href={`${appUrl}/my-work`}
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

import { format } from "date-fns";
import { EmailShellV2, StatusBadge, V2 } from "./components/shell-v2";
import { CRITICALITY_COLOR, CRITICALITY_LABEL } from "./components/criticality";

export interface SlaEscalationEmailProps {
  tier: string;
  ticketNo: string;
  subject: string;
  projectName: string;
  criticality: string;
  createdAt: string;
  hoursOpen: number;
  appUrl: string;
}

const FONT = "Helvetica, Arial, sans-serif";
const ESCALATION_RED = "#F0574B";

/** Organizational escalation broadcast — distinct from the per-criticality
 * SLA breach/warning email (sla-alert-email.tsx): this fires off a flat,
 * project-wide "still unresolved after N minutes" ladder (SL1/SL2/SL3),
 * independent of the ticket's own criticality-based due date. */
export default function SlaEscalationEmail({
  tier = "SL2",
  ticketNo = "ACME-INC-00001",
  subject = "Unable to post goods receipt",
  projectName = "Acme S/4HANA Rollout",
  criticality = "P1_critical",
  createdAt = new Date().toISOString(),
  hoursOpen = 8,
  appUrl = "https://objectra.app",
}: SlaEscalationEmailProps) {
  const critColor = CRITICALITY_COLOR[criticality] ?? V2.muted;
  const critLabel = CRITICALITY_LABEL[criticality] ?? criticality;

  return (
    <EmailShellV2
      preview={`${tier} escalation: ${ticketNo} has been open ${hoursOpen}h — ${subject}`}
      badge={`${tier} Escalation`}
      appUrl={appUrl}
    >
      <StatusBadge label={`${tier} escalation`} color={ESCALATION_RED} />

      <div className="darktext" style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: V2.heading, lineHeight: "36px", paddingTop: 14 }}>
        This ticket needs attention
      </div>
      <div style={{ fontFamily: FONT, fontSize: 15, color: V2.body, lineHeight: "24px", paddingTop: 12 }}>
        {ticketNo} ({subject}) on {projectName} has been open for <strong>{hoursOpen} hour{hoursOpen === 1 ? "" : "s"}</strong> without
        resolution, crossing the {tier} escalation threshold. Raised {format(new Date(createdAt), "EEE, MMM d 'at' h:mm a")}.
      </div>

      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr><td height={26} style={{ fontSize: 1, lineHeight: "1px" }}>&nbsp;</td></tr>
      </table>

      <table
        role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%"
        style={{ border: `1px solid ${V2.border}`, borderLeft: `4px solid ${ESCALATION_RED}`, borderRadius: 10 }}
      >
        <tr>
          <td style={{ padding: "22px 24px" }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" as const, color: V2.goldDark, lineHeight: "16px" }}>
              {ticketNo} · <span style={{ color: critColor }}>{critLabel}</span>
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
              href={`${appUrl}/settings`}
              style={{ display: "block", padding: "14px 24px", fontFamily: FONT, fontSize: 15, fontWeight: 700, color: V2.headerBg, textDecoration: "none", lineHeight: "20px" }}
            >
              Open project settings &nbsp;&nbsp;→
            </a>
          </td>
        </tr>
      </table>
    </EmailShellV2>
  );
}

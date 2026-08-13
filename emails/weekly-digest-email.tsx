import { format } from "date-fns";
import { EmailShellV2, StatusBadge, V2 } from "./components/shell-v2";
import { CRITICALITY_COLOR, CRITICALITY_LABEL } from "./components/criticality";

const FONT = "Helvetica, Arial, sans-serif";
const OVERDUE = "#c0392b";

/** Added when the project's phase is hypercare/support (section 18). */
export interface WeeklyDigestSupportSection {
  openedThisWeek: number;
  resolvedThisWeek: number;
  openByCriticality: { criticality: string; count: number }[];
  slaCompliancePct: number;
  oldestOpenTicket: { ticketNo: string; subject: string; daysOpen: number } | null;
}

export interface DigestObjectItem {
  title: string;
  module: string | null;
  status: string;
  statusColor: string;
  functionalName: string | null;
  technicalName: string | null;
  dueDate?: string | null;
}

export interface WeeklyDigestEmailProps {
  recipientName: string;
  projectName: string;
  weekStart: string;
  weekEnd: string;
  total: number;
  live: number;
  inFlight: number;
  atRisk: number;
  percentComplete: number;
  movedThisWeek: DigestObjectItem[];
  overdue: DigestObjectItem[];
  support?: WeeklyDigestSupportSection | null;
  appUrl: string;
}

function ObjectRow({ item, isLast }: { item: DigestObjectItem; isLast: boolean }) {
  return (
    <tr>
      <td style={{ padding: "16px 20px", borderBottom: isLast ? "none" : `1px solid ${V2.borderLight}` }}>
        <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
          <tr>
            <td
              style={{
                fontFamily: FONT,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.5,
                color: V2.goldDark,
                lineHeight: "14px",
              }}
            >
              {item.module || "—"}
            </td>
            <td align="right">
              <StatusBadge label={item.status} color={item.statusColor} />
            </td>
          </tr>
        </table>
        <div
          className="darktext"
          style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: V2.heading, lineHeight: "21px", paddingTop: 6 }}
        >
          {item.title}
        </div>
        <div style={{ fontFamily: FONT, fontSize: 12, color: V2.muted, lineHeight: "18px", paddingTop: 4 }}>
          Functional: <strong style={{ color: V2.body }}>{item.functionalName ?? "Unassigned"}</strong> ·
          Technical: <strong style={{ color: V2.body }}>{item.technicalName ?? "Unassigned"}</strong>
          {item.dueDate && (
            <>
              {" "}
              · Due{" "}
              <span style={{ color: OVERDUE, fontWeight: 700 }}>{format(new Date(item.dueDate), "MMM d")}</span>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function ObjectList({ items }: { items: DigestObjectItem[] }) {
  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      width="100%"
      style={{ border: `1px solid ${V2.border}`, borderRadius: 10 }}
    >
      {items.map((item, i) => (
        <ObjectRow key={`${item.title}-${i}`} item={item} isLast={i === items.length - 1} />
      ))}
    </table>
  );
}

export default function WeeklyDigestEmail({
  recipientName = "team",
  projectName = "Acme S/4HANA Rollout",
  weekStart = "Jul 27",
  weekEnd = "Aug 1, 2026",
  total = 14,
  live = 3,
  inFlight = 11,
  atRisk = 0,
  percentComplete = 21,
  movedThisWeek = [
    {
      title: "Vendor onboarding approval",
      module: "MM",
      status: "Development in Progress",
      statusColor: "#b08d4c",
      functionalName: "Priya Sharma",
      technicalName: "Jordan Lee",
    },
  ],
  overdue = [],
  support = null,
  appUrl = "https://objectra.app",
}: WeeklyDigestEmailProps) {
  return (
    <EmailShellV2
      preview={`${projectName}: ${percentComplete}% complete · ${live} live, ${inFlight} in flight · ${movedThisWeek.length} objects moved this week`}
      badge="Weekly Digest"
      appUrl={appUrl}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.5,
          textTransform: "uppercase" as const,
          color: V2.goldDark,
          lineHeight: "16px",
        }}
      >
        Week of {weekStart} – {weekEnd}
      </div>
      <div
        className="darktext"
        style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: V2.heading, lineHeight: "36px", paddingTop: 10 }}
      >
        Weekly status digest
      </div>
      <div style={{ fontFamily: FONT, fontSize: 15, color: V2.body, lineHeight: "24px", paddingTop: 12 }}>
        Hi {recipientName} — here&apos;s this week&apos;s summary for <strong style={{ color: V2.strong }}>{projectName}</strong>.
      </div>

      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr>
          <td height={24} style={{ fontSize: 1, lineHeight: "1px" }}>
            &nbsp;
          </td>
        </tr>
      </table>

      {/* Summary panel */}
      <table
        role="presentation"
        cellPadding={0}
        cellSpacing={0}
        border={0}
        width="100%"
        style={{ border: `1px solid ${V2.border}`, borderLeft: `4px solid ${V2.goldDark}`, borderRadius: 10 }}
      >
        <tr>
          <td style={{ padding: "22px 24px 0 24px" }}>
            <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
              <tr>
                <td className="darktext" style={{ fontFamily: FONT, fontSize: 36, fontWeight: 700, color: V2.heading, lineHeight: "40px" }}>
                  {percentComplete}
                  <span style={{ fontSize: 22, color: V2.goldDark }}>%</span>{" "}
                  <span style={{ fontSize: 14, fontWeight: 400, color: V2.muted }}>complete</span>
                </td>
                <td align="right" valign="bottom" style={{ fontFamily: FONT, fontSize: 13, color: V2.muted, lineHeight: "18px" }}>
                  {live} of {total} objects live
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style={{ padding: "14px 24px 0 24px" }}>
            <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
              <tr>
                <td width={`${percentComplete}%`} height={8} style={{ backgroundColor: V2.goldDark, borderRadius: "4px 0 0 4px", fontSize: 1, lineHeight: "1px" }}>
                  &nbsp;
                </td>
                <td height={8} style={{ backgroundColor: V2.border, borderRadius: "0 4px 4px 0", fontSize: 1, lineHeight: "1px" }}>
                  &nbsp;
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style={{ padding: "18px 24px 22px 24px" }}>
            <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
              <tr>
                <td width="33%" align="center" style={{ borderRight: `1px solid ${V2.borderLight}` }}>
                  <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: V2.live, lineHeight: "30px" }}>{live}</div>
                  <div style={{ fontFamily: FONT, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" as const, color: V2.muted, lineHeight: "16px", paddingTop: 2 }}>
                    Live
                  </div>
                </td>
                <td width="34%" align="center" style={{ borderRight: `1px solid ${V2.borderLight}` }}>
                  <div className="darktext" style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: V2.strong, lineHeight: "30px" }}>
                    {inFlight}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" as const, color: V2.muted, lineHeight: "16px", paddingTop: 2 }}>
                    In flight
                  </div>
                </td>
                <td width="33%" align="center">
                  <div
                    className="darktext"
                    style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: atRisk > 0 ? OVERDUE : V2.heading, lineHeight: "30px" }}
                  >
                    {atRisk}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" as const, color: V2.muted, lineHeight: "16px", paddingTop: 2 }}>
                    At risk
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr>
          <td height={30} style={{ fontSize: 1, lineHeight: "1px" }}>
            &nbsp;
          </td>
        </tr>
      </table>

      {movedThisWeek.length > 0 && (
        <>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: "uppercase" as const,
              color: V2.muted,
              lineHeight: "16px",
              paddingBottom: 12,
            }}
          >
            What moved this week · {movedThisWeek.length} object{movedThisWeek.length === 1 ? "" : "s"}
          </div>
          <ObjectList items={movedThisWeek} />
          <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
            <tr>
              <td height={30} style={{ fontSize: 1, lineHeight: "1px" }}>
                &nbsp;
              </td>
            </tr>
          </table>
        </>
      )}

      {overdue.length > 0 && (
        <>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: "uppercase" as const,
              color: OVERDUE,
              lineHeight: "16px",
              paddingBottom: 12,
            }}
          >
            Needs attention · {overdue.length} object{overdue.length === 1 ? "" : "s"}
          </div>
          <ObjectList items={overdue} />
          <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
            <tr>
              <td height={30} style={{ fontSize: 1, lineHeight: "1px" }}>
                &nbsp;
              </td>
            </tr>
          </table>
        </>
      )}

      {support && (
        <>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: "uppercase" as const,
              color: V2.muted,
              lineHeight: "16px",
              paddingBottom: 12,
            }}
          >
            Support this week
          </div>
          <table
            role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%"
            style={{ border: `1px solid ${V2.border}`, borderRadius: 10 }}
          >
            <tr>
              <td style={{ padding: "18px 24px" }}>
                <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
                  <tr>
                    <td width="25%" align="center" style={{ borderRight: `1px solid ${V2.borderLight}` }}>
                      <div className="darktext" style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: V2.heading, lineHeight: "28px" }}>{support.openedThisWeek}</div>
                      <div style={{ fontFamily: FONT, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" as const, color: V2.muted, lineHeight: "14px", paddingTop: 2 }}>Opened</div>
                    </td>
                    <td width="25%" align="center" style={{ borderRight: `1px solid ${V2.borderLight}` }}>
                      <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: V2.live, lineHeight: "28px" }}>{support.resolvedThisWeek}</div>
                      <div style={{ fontFamily: FONT, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" as const, color: V2.muted, lineHeight: "14px", paddingTop: 2 }}>Resolved</div>
                    </td>
                    <td width="25%" align="center" style={{ borderRight: `1px solid ${V2.borderLight}` }}>
                      <div className="darktext" style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: support.slaCompliancePct < 90 ? OVERDUE : V2.heading, lineHeight: "28px" }}>{support.slaCompliancePct}%</div>
                      <div style={{ fontFamily: FONT, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" as const, color: V2.muted, lineHeight: "14px", paddingTop: 2 }}>SLA compliance</div>
                    </td>
                    <td width="25%" align="center">
                      <div className="darktext" style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: V2.heading, lineHeight: "28px" }}>{support.oldestOpenTicket?.daysOpen ?? 0}</div>
                      <div style={{ fontFamily: FONT, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" as const, color: V2.muted, lineHeight: "14px", paddingTop: 2 }}>Oldest open (d)</div>
                    </td>
                  </tr>
                </table>
                {support.openByCriticality.length > 0 && (
                  <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%" style={{ marginTop: 16 }}>
                    <tr>
                      {support.openByCriticality.map((c) => (
                        <td key={c.criticality} style={{ paddingRight: 8 }}>
                          <StatusBadge label={`${CRITICALITY_LABEL[c.criticality] ?? c.criticality}: ${c.count}`} color={CRITICALITY_COLOR[c.criticality] ?? V2.muted} />
                        </td>
                      ))}
                    </tr>
                  </table>
                )}
                {support.oldestOpenTicket && (
                  <div style={{ fontFamily: FONT, fontSize: 12, color: V2.muted, lineHeight: "18px", paddingTop: 14 }}>
                    Oldest open: <strong style={{ color: V2.body }}>{support.oldestOpenTicket.ticketNo}</strong> — {support.oldestOpenTicket.subject}
                  </div>
                )}
              </td>
            </tr>
          </table>
          <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
            <tr><td height={30} style={{ fontSize: 1, lineHeight: "1px" }}>&nbsp;</td></tr>
          </table>
        </>
      )}

      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr>
          <td align="center" style={{ backgroundColor: V2.goldDark, borderRadius: 10 }}>
            <a
              href={`${appUrl}/dashboard`}
              style={{
                display: "block",
                padding: "14px 24px",
                fontFamily: FONT,
                fontSize: 15,
                fontWeight: 700,
                color: V2.headerBg,
                textDecoration: "none",
                lineHeight: "20px",
              }}
            >
              Open dashboard &nbsp;&nbsp;→
            </a>
          </td>
        </tr>
      </table>

      <div style={{ fontFamily: FONT, fontSize: 12, color: V2.muted, textAlign: "center" as const, paddingTop: 14, lineHeight: "18px" }}>
        Full object list, blockers, and timelines are on the dashboard.
      </div>
    </EmailShellV2>
  );
}

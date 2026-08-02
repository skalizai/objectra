import { Fragment } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { EmailShellV2, StatusBadge, V2 } from "./components/shell-v2";

export interface ObjectStatusEmailProps {
  recipientName: string;
  heading: string;
  message: string;
  objectTitle: string;
  wricefId: string | null;
  projectName: string;
  status: string;
  previousStatus: string | null;
  statusColor: string;
  /** Every configured status in pipeline order, for the progress tracker —
   * the org's own list (Settings → Object statuses), not a fixed 4 stages. */
  pipelineStatuses: string[];
  dueDate: string | null;
  technicalName: string | null;
  functionalName: string | null;
  appUrl: string;
}

const FONT = "Helvetica, Arial, sans-serif";

function DetailRow({ label, value, first = false }: { label: string; value: React.ReactNode; first?: boolean }) {
  return (
    <tr>
      <td
        width={150}
        style={{
          fontFamily: FONT,
          fontSize: 13,
          color: V2.muted,
          padding: "6px 0",
          lineHeight: "19px",
          borderTop: first ? "none" : `1px solid ${V2.borderLight}`,
        }}
      >
        {label}
      </td>
      <td
        className="darktext"
        style={{
          fontFamily: FONT,
          fontSize: 13,
          fontWeight: 700,
          color: "#2c2820",
          padding: "6px 0",
          lineHeight: "19px",
          borderTop: first ? "none" : `1px solid ${V2.borderLight}`,
        }}
      >
        {value}
      </td>
    </tr>
  );
}

function ProgressTracker({ statuses, current }: { statuses: string[]; current: string }) {
  if (statuses.length === 0) return null;
  const currentIndex = Math.max(statuses.indexOf(current), 0);

  return (
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
        Object progress
      </div>
      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr>
          {statuses.map((s, i) => (
            <Fragment key={s}>
              {i > 0 && (
                <td width={4} style={{ fontSize: 1, lineHeight: "1px" }}>
                  &nbsp;
                </td>
              )}
              <td
                height={6}
                style={{
                  backgroundColor: i <= currentIndex ? V2.goldDark : V2.border,
                  borderRadius: i === 0 ? "3px 0 0 3px" : i === statuses.length - 1 ? "0 3px 3px 0" : undefined,
                  fontSize: 1,
                  lineHeight: "1px",
                }}
              >
                &nbsp;
              </td>
            </Fragment>
          ))}
        </tr>
        <tr>
          <td
            style={{ fontFamily: FONT, fontSize: 11, color: V2.muted, paddingTop: 8, lineHeight: "15px" }}
          >
            {statuses[0]}
          </td>
          {statuses.length > 1 && (
            <td align="right" style={{ fontFamily: FONT, fontSize: 11, color: V2.mutedFaint, paddingTop: 8, lineHeight: "15px" }}>
              {statuses[statuses.length - 1]}
            </td>
          )}
        </tr>
      </table>
    </>
  );
}

export default function ObjectStatusEmail({
  recipientName = "team",
  heading = "Now in Development in Progress",
  message = "This object has moved to Development in Progress.",
  objectTitle = "Vendor onboarding approval",
  wricefId = "WF-0142",
  projectName = "Acme S/4HANA Rollout",
  status = "Development in Progress",
  previousStatus = "Awaiting for FSD",
  statusColor = "#b08d4c",
  pipelineStatuses = ["Awaiting for FSD", "Development in Progress", "Functional Testing in Quality", "Live"],
  dueDate = null,
  technicalName = "Jordan Lee",
  functionalName = "Priya Sharma",
  appUrl = "https://objectra.app",
}: ObjectStatusEmailProps) {
  const daysRemaining = dueDate ? differenceInCalendarDays(new Date(dueDate), new Date()) : null;

  return (
    <EmailShellV2
      preview={`${objectTitle} moved to ${status}${dueDate ? ` · Due ${format(new Date(dueDate), "MMM d")}` : ""} — details inside`}
      badge="Status Update"
      appUrl={appUrl}
    >
      {/* Status transition */}
      {previousStatus && previousStatus !== status && (
        <table role="presentation" cellPadding={0} cellSpacing={0} border={0}>
          <tr>
            <td
              style={{
                fontFamily: FONT,
                fontSize: 13,
                color: V2.muted,
                lineHeight: "24px",
                textDecoration: "line-through",
              }}
            >
              {previousStatus}
            </td>
            <td style={{ fontFamily: FONT, fontSize: 14, color: V2.goldDark, padding: "0 10px", lineHeight: "24px" }}>
              →
            </td>
            <td>
              <StatusBadge label={status} color={statusColor} />
            </td>
          </tr>
        </table>
      )}

      <div
        className="darktext"
        style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: V2.heading, lineHeight: "36px", paddingTop: 18 }}
      >
        {heading}
      </div>

      <div style={{ fontFamily: FONT, fontSize: 15, color: V2.body, lineHeight: "24px", paddingTop: 12 }}>
        Hi {recipientName} — {message}
      </div>

      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr>
          <td height={26} style={{ fontSize: 1, lineHeight: "1px" }}>
            &nbsp;
          </td>
        </tr>
      </table>

      {/* Object card */}
      <table
        role="presentation"
        cellPadding={0}
        cellSpacing={0}
        border={0}
        width="100%"
        style={{ border: `1px solid ${V2.border}`, borderLeft: `4px solid ${V2.goldDark}`, borderRadius: 10 }}
      >
        <tr>
          <td style={{ padding: "22px 24px 8px 24px" }}>
            {wricefId && (
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
                {wricefId}
              </div>
            )}
            <div
              className="darktext"
              style={{ fontFamily: FONT, fontSize: 19, fontWeight: 700, color: V2.heading, lineHeight: "26px", paddingTop: 6 }}
            >
              {objectTitle}
            </div>
          </td>
        </tr>
        <tr>
          <td style={{ padding: "8px 24px 22px 24px" }}>
            <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
              <DetailRow label="Project" value={projectName} first />
              <DetailRow label="Status" value={<span style={{ color: statusColor }}>{status}</span>} />
              {dueDate && (
                <DetailRow
                  label="Due date"
                  value={
                    <>
                      {format(new Date(dueDate), "EEE, MMM d yyyy")}{" "}
                      <span style={{ fontWeight: 400, color: V2.muted }}>
                        {daysRemaining !== null && daysRemaining < 0
                          ? `(${Math.abs(daysRemaining)} day(s) overdue)`
                          : `(${daysRemaining} day(s) left)`}
                      </span>
                    </>
                  }
                />
              )}
              {technicalName && <DetailRow label="Technical consultant" value={technicalName} />}
              {functionalName && <DetailRow label="Functional consultant" value={functionalName} />}
            </table>
          </td>
        </tr>
      </table>

      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr>
          <td height={28} style={{ fontSize: 1, lineHeight: "1px" }}>
            &nbsp;
          </td>
        </tr>
      </table>

      <ProgressTracker statuses={pipelineStatuses} current={status} />

      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr>
          <td height={30} style={{ fontSize: 1, lineHeight: "1px" }}>
            &nbsp;
          </td>
        </tr>
      </table>

      {/* Bulletproof button */}
      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr>
          <td align="center" style={{ backgroundColor: V2.goldDark, borderRadius: 10 }}>
            <a
              href={`${appUrl}/my-work`}
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
              View object in Objectra Labs &nbsp;&nbsp;→
            </a>
          </td>
        </tr>
      </table>

      <div style={{ fontFamily: FONT, fontSize: 12, color: V2.muted, textAlign: "center" as const, paddingTop: 14, lineHeight: "18px" }}>
        Questions about this change? Reach out to your project lead.
      </div>
    </EmailShellV2>
  );
}

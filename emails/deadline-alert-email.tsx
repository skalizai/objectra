import { format } from "date-fns";
import { EmailShellV2, V2 } from "./components/shell-v2";

const FONT = "Helvetica, Arial, sans-serif";
const OVERDUE = "#c0392b";

export interface DeadlineAlertEmailProps {
  recipientName: string;
  projectName: string;
  items: { title: string; wricefId: string | null; dueDate: string; daysRemaining: number }[];
  appUrl: string;
}

function DeadlineRow({
  item,
  isLast,
}: {
  item: DeadlineAlertEmailProps["items"][number];
  isLast: boolean;
}) {
  const overdue = item.daysRemaining < 0;
  return (
    <tr>
      <td style={{ padding: "16px 20px", borderBottom: isLast ? "none" : `1px solid ${V2.borderLight}` }}>
        <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
          <tr>
            <td>
              {item.wricefId && (
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    color: V2.goldDark,
                    lineHeight: "14px",
                  }}
                >
                  {item.wricefId}
                </div>
              )}
              <div
                className="darktext"
                style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: V2.heading, lineHeight: "21px", paddingTop: 2 }}
              >
                {item.title}
              </div>
            </td>
            <td align="right" valign="top">
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: 11,
                  fontWeight: 700,
                  color: overdue ? OVERDUE : V2.strong,
                  background: overdue ? "#f7e3e0" : "#f3ead9",
                  borderRadius: 12,
                  padding: "3px 10px",
                  display: "inline-block",
                }}
              >
                {overdue ? `${Math.abs(item.daysRemaining)}d overdue` : `${item.daysRemaining}d left`}
              </span>
            </td>
          </tr>
        </table>
        <div style={{ fontFamily: FONT, fontSize: 12, color: V2.muted, lineHeight: "18px", paddingTop: 4 }}>
          Due {format(new Date(item.dueDate), "EEE, MMM d yyyy")}
        </div>
      </td>
    </tr>
  );
}

export default function DeadlineAlertEmail({
  recipientName = "team",
  projectName = "Acme S/4HANA Rollout",
  items = [
    { title: "Vendor onboarding approval", wricefId: "WF-0142", dueDate: "2026-07-22", daysRemaining: 3 },
    { title: "Regional sales variance", wricefId: "RP-0087", dueDate: "2026-07-18", daysRemaining: -1 },
  ],
  appUrl = "https://objectra.app",
}: DeadlineAlertEmailProps) {
  return (
    <EmailShellV2
      preview={`${items.length} object${items.length === 1 ? "" : "s"} need attention on ${projectName}`}
      badge="Deadline Alert"
      appUrl={appUrl}
    >
      <div
        className="darktext"
        style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: V2.heading, lineHeight: "36px" }}
      >
        {items.length} object{items.length === 1 ? "" : "s"} need{items.length === 1 ? "s" : ""} attention
      </div>

      <div style={{ fontFamily: FONT, fontSize: 15, color: V2.body, lineHeight: "24px", paddingTop: 12 }}>
        Hi {recipientName} — the object{items.length === 1 ? " below is" : "s below are"} overdue or due soon on{" "}
        <strong style={{ color: V2.strong }}>{projectName}</strong>.
      </div>

      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr>
          <td height={24} style={{ fontSize: 1, lineHeight: "1px" }}>
            &nbsp;
          </td>
        </tr>
      </table>

      <table
        role="presentation"
        cellPadding={0}
        cellSpacing={0}
        border={0}
        width="100%"
        style={{ border: `1px solid ${V2.border}`, borderRadius: 10 }}
      >
        {items.map((item, i) => (
          <DeadlineRow key={`${item.wricefId ?? item.title}-${i}`} item={item} isLast={i === items.length - 1} />
        ))}
      </table>

      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr>
          <td height={30} style={{ fontSize: 1, lineHeight: "1px" }}>
            &nbsp;
          </td>
        </tr>
      </table>

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
              View in Objectra Labs &nbsp;&nbsp;→
            </a>
          </td>
        </tr>
      </table>
    </EmailShellV2>
  );
}

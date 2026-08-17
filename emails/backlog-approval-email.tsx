import { EmailShellV2, V2 } from "./components/shell-v2";

const FONT = "Helvetica, Arial, sans-serif";
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export interface BacklogApprovalItem {
  itemNo: string;
  companyCode: string | null;
  module: string | null;
  devType: string | null;
  description: string;
  complexity: string | null;
  totalDays: number;
  totalCost: number;
}

export interface BacklogApprovalEmailProps {
  recipientName: string;
  projectName: string;
  crNo: string;
  items: BacklogApprovalItem[];
  totalDays: number;
  totalCost: number;
  appUrl: string;
}

function ItemRow({ item, isLast }: { item: BacklogApprovalItem; isLast: boolean }) {
  return (
    <tr>
      <td style={{ padding: "16px 20px", borderBottom: isLast ? "none" : `1px solid ${V2.borderLight}` }}>
        <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
          <tr>
            <td style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: V2.goldDark, lineHeight: "14px" }}>
              {item.itemNo} · {item.module || "—"} {item.companyCode ? `· ${item.companyCode}` : ""}
            </td>
            <td align="right" style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: V2.heading, lineHeight: "18px" }}>
              {money(item.totalCost)}
            </td>
          </tr>
        </table>
        <div className="darktext" style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: V2.heading, lineHeight: "21px", paddingTop: 6 }}>
          {item.description}
        </div>
        <div style={{ fontFamily: FONT, fontSize: 12, color: V2.muted, lineHeight: "18px", paddingTop: 4 }}>
          {item.devType || "—"} · {item.complexity || "—"} complexity · {item.totalDays.toFixed(1)} days
        </div>
      </td>
    </tr>
  );
}

/** Client-facing batch approval request -- fires from sendForApproval()
 * when a PM sends a set of registered backlog items to the client. Same
 * list-row shape as WeeklyDigestEmail's ObjectList, one send per client
 * recipient (project_members role='client'). */
export default function BacklogApprovalEmail({
  recipientName = "there",
  projectName = "Acme S/4HANA Rollout",
  crNo = "CR002",
  items = [
    {
      itemNo: "ACME-BL-00001",
      companyCode: "1000",
      module: "MM",
      devType: "Enhancement",
      description: "Custom field on the PO header screen",
      complexity: "Medium",
      totalDays: 6,
      totalCost: 2826,
    },
  ],
  totalDays = 6,
  totalCost = 2826,
  appUrl = "https://objectra.app",
}: BacklogApprovalEmailProps) {
  return (
    <EmailShellV2
      preview={`${crNo}: ${items.length} backlog item${items.length === 1 ? "" : "s"} awaiting your approval — ${totalDays.toFixed(1)} days, ${money(totalCost)}`}
      badge="Backlog Approval"
      appUrl={appUrl}
    >
      <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" as const, color: V2.goldDark, lineHeight: "16px" }}>
        Change Reference {crNo}
      </div>
      <div className="darktext" style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: V2.heading, lineHeight: "36px", paddingTop: 10 }}>
        Backlog items awaiting your approval
      </div>
      <div style={{ fontFamily: FONT, fontSize: 15, color: V2.body, lineHeight: "24px", paddingTop: 12 }}>
        Hi {recipientName} — {items.length} newly estimated backlog item{items.length === 1 ? "" : "s"} for{" "}
        <strong style={{ color: V2.strong }}>{projectName}</strong> {items.length === 1 ? "is" : "are"} ready for your review and
        formal approval.
      </div>

      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr><td height={24} style={{ fontSize: 1, lineHeight: "1px" }}>&nbsp;</td></tr>
      </table>

      {/* Totals panel */}
      <table
        role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%"
        style={{ border: `1px solid ${V2.border}`, borderLeft: `4px solid ${V2.goldDark}`, borderRadius: 10 }}
      >
        <tr>
          <td style={{ padding: "18px 24px" }}>
            <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
              <tr>
                <td width="50%" align="center" style={{ borderRight: `1px solid ${V2.borderLight}` }}>
                  <div className="darktext" style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: V2.heading, lineHeight: "30px" }}>
                    {totalDays.toFixed(1)}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" as const, color: V2.muted, lineHeight: "16px", paddingTop: 2 }}>
                    Total days
                  </div>
                </td>
                <td width="50%" align="center">
                  <div className="darktext" style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: V2.heading, lineHeight: "30px" }}>
                    {money(totalCost)}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" as const, color: V2.muted, lineHeight: "16px", paddingTop: 2 }}>
                    Total cost (USD)
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr><td height={30} style={{ fontSize: 1, lineHeight: "1px" }}>&nbsp;</td></tr>
      </table>

      <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" as const, color: V2.muted, lineHeight: "16px", paddingBottom: 12 }}>
        Items in this batch
      </div>
      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%" style={{ border: `1px solid ${V2.border}`, borderRadius: 10 }}>
        {items.map((item, i) => (
          <ItemRow key={item.itemNo} item={item} isLast={i === items.length - 1} />
        ))}
      </table>

      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr><td height={30} style={{ fontSize: 1, lineHeight: "1px" }}>&nbsp;</td></tr>
      </table>

      <div style={{ fontFamily: FONT, fontSize: 12, color: V2.muted, lineHeight: "20px" }}>
        Costs are estimated per the project&apos;s standard rate card (Technical/Functional/Fiori/PMO rates, 1 day = 8 hours),
        including PMO and one month of post-go-live support (PGLS) allocation. Please reply to confirm approval, request
        changes, or flag any item to defer. Approved items will be added to the project&apos;s main object scope.
      </div>

      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr><td height={26} style={{ fontSize: 1, lineHeight: "1px" }}>&nbsp;</td></tr>
      </table>

      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr>
          <td align="center" style={{ backgroundColor: V2.goldDark, borderRadius: 10 }}>
            <a
              href={appUrl}
              style={{ display: "block", padding: "14px 24px", fontFamily: FONT, fontSize: 15, fontWeight: 700, color: V2.headerBg, textDecoration: "none", lineHeight: "20px" }}
            >
              Open Objectra &nbsp;&nbsp;→
            </a>
          </td>
        </tr>
      </table>
    </EmailShellV2>
  );
}

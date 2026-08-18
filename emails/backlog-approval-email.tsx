import { EmailShellV2, V2 } from "./components/shell-v2";

const FONT = "Helvetica, Arial, sans-serif";
const fmtDays = (n: number) => `${n.toFixed(1)}d`;

export interface BacklogApprovalItem {
  itemNo: string;
  companyCode: string | null;
  module: string | null;
  devType: string | null;
  description: string;
  complexity: string | null;
  devDays: number;
  funcDays: number;
  fioriDays: number;
}

export interface BacklogApprovalEmailProps {
  recipientName: string;
  projectName: string;
  crNo: string;
  items: BacklogApprovalItem[];
  totalDays: number;
  appUrl: string;
  approveUrl?: string;
  rejectUrl?: string;
}

function ItemRow({ item, isLast }: { item: BacklogApprovalItem; isLast: boolean }) {
  const itemTotal = item.devDays + item.funcDays + item.fioriDays;
  return (
    <tr>
      <td style={{ padding: "16px 20px", borderBottom: isLast ? "none" : `1px solid ${V2.borderLight}` }}>
        <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
          <tr>
            <td style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: V2.goldDark, lineHeight: "14px" }}>
              {item.itemNo} · {item.module || "—"} {item.companyCode ? `· ${item.companyCode}` : ""}
            </td>
            <td align="right" style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: V2.heading, lineHeight: "18px" }}>
              {fmtDays(itemTotal)}
            </td>
          </tr>
        </table>
        <div className="darktext" style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: V2.heading, lineHeight: "21px", paddingTop: 6 }}>
          {item.description}
        </div>
        <div style={{ fontFamily: FONT, fontSize: 12, color: V2.muted, lineHeight: "18px", paddingTop: 4 }}>
          {item.devType || "—"} · {item.complexity || "—"} complexity · Dev {fmtDays(item.devDays)} · Functional {fmtDays(item.funcDays)} · Fiori {fmtDays(item.fioriDays)}
        </div>
      </td>
    </tr>
  );
}

/** Client-facing batch approval request -- fires from sendForApproval()
 * when a PM sends a set of registered backlog items to the client. Same
 * list-row shape as WeeklyDigestEmail's ObjectList, one send per client
 * recipient (project_members role='client'). Effort-in-days only -- no
 * cost/rate figures anywhere in this feature. */
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
      devDays: 4,
      funcDays: 2,
      fioriDays: 0,
    },
  ],
  totalDays = 6,
  appUrl = "https://objectra.app",
  approveUrl,
  rejectUrl,
}: BacklogApprovalEmailProps) {
  return (
    <EmailShellV2
      preview={`${crNo}: ${items.length} backlog item${items.length === 1 ? "" : "s"} awaiting your approval — ${totalDays.toFixed(1)} days total`}
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
          <td style={{ padding: "18px 24px" }} align="center">
            <div className="darktext" style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: V2.heading, lineHeight: "30px" }}>
              {totalDays.toFixed(1)}
            </div>
            <div style={{ fontFamily: FONT, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" as const, color: V2.muted, lineHeight: "16px", paddingTop: 2 }}>
              Total effort days
            </div>
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
        Effort is shown in days (1 day = 8 hours), broken down by Development, Functional, and Fiori work.{" "}
        {approveUrl && rejectUrl
          ? "Approve or reject this batch directly below, or open Objectra for full details."
          : "Please reply to confirm approval, request changes, or flag any item to defer."}{" "}
        Approved items will be added to the project&apos;s main object scope.
      </div>

      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr><td height={26} style={{ fontSize: 1, lineHeight: "1px" }}>&nbsp;</td></tr>
      </table>

      {approveUrl && rejectUrl && (
        <>
          <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
            <tr>
              <td width="50%" style={{ paddingRight: 6 }}>
                <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
                  <tr>
                    <td align="center" style={{ backgroundColor: V2.goldDark, borderRadius: 10 }}>
                      <a
                        href={approveUrl}
                        style={{ display: "block", padding: "13px 12px", fontFamily: FONT, fontSize: 14, fontWeight: 700, color: "#ffffff", textDecoration: "none", lineHeight: "18px" }}
                      >
                        Approve
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
              <td width="50%" style={{ paddingLeft: 6 }}>
                <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
                  <tr>
                    <td align="center" style={{ border: `1px solid ${V2.border}`, borderRadius: 10 }}>
                      <a
                        href={rejectUrl}
                        style={{ display: "block", padding: "13px 12px", fontFamily: FONT, fontSize: 14, fontWeight: 700, color: V2.body, textDecoration: "none", lineHeight: "18px" }}
                      >
                        Reject
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
            <tr><td height={14} style={{ fontSize: 1, lineHeight: "1px" }}>&nbsp;</td></tr>
          </table>
        </>
      )}

      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
        <tr>
          <td align="center" style={{ backgroundColor: approveUrl && rejectUrl ? "transparent" : V2.goldDark, border: approveUrl && rejectUrl ? `1px solid ${V2.border}` : "none", borderRadius: 10 }}>
            <a
              href={appUrl}
              style={{ display: "block", padding: "14px 24px", fontFamily: FONT, fontSize: 15, fontWeight: 700, color: approveUrl && rejectUrl ? V2.body : V2.headerBg, textDecoration: "none", lineHeight: "20px" }}
            >
              Open Objectra &nbsp;&nbsp;→
            </a>
          </td>
        </tr>
      </table>
    </EmailShellV2>
  );
}

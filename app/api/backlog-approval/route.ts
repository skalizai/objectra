import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

const PAGE_BG = "#efece6";
const CARD_BG = "#fdfcfa";
const HEADER_BG = "#1f1c16";
const GOLD = "#c9a45e";
const GOLD_DARK = "#b08d4c";
const REJECT_RED = "#b3413a";
const HEADING = "#1f1c16";
const BODY = "#55503f";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain server-rendered HTML, not React Email -- this is a browser landing
 * page an approver lands on from their inbox, not a message sent through
 * Resend. Palette mirrors emails/components/shell-v2.tsx's V2 constants for
 * visual continuity with the email the link came from. */
function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)} — Objectra</title>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};font-family:Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE_BG};">
<tr><td align="center" style="padding:48px 16px;">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:100%;">
<tr><td style="background:${HEADER_BG};border-radius:14px 14px 0 0;padding:20px 28px;color:#ffffff;font-size:16px;font-weight:700;">
Objectra<span style="color:${GOLD};">Labs</span>
</td></tr>
<tr><td style="height:4px;background:${GOLD_DARK};font-size:1px;line-height:1px;">&nbsp;</td></tr>
<tr><td style="background:${CARD_BG};border-radius:0 0 14px 14px;padding:32px 28px;color:${BODY};font-size:14px;line-height:22px;">
${body}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function htmlResponse(status: number, title: string, body: string) {
  return new NextResponse(page(title, body), {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

const OPEN_LINK = `<p style="margin:20px 0 0;"><a href="${APP_URL}" style="color:${GOLD_DARK};font-weight:700;text-decoration:none;">Open Objectra &nbsp;→</a></p>`;

type TokenRow = {
  id: string;
  project_id: string;
  batch_ref: string;
  item_ids: string[];
  status: "pending" | "used" | "expired";
  resolved_action: "approved" | "rejected" | null;
  expires_at: string;
};

async function loadToken(admin: ReturnType<typeof createAdminClient>, token: string): Promise<TokenRow | null> {
  const { data } = await admin.from("backlog_approval_tokens").select("*").eq("token", token).maybeSingle();
  return (data as TokenRow | null) ?? null;
}

function parseAction(raw: string | null): "approve" | "reject" | null {
  return raw === "approve" || raw === "reject" ? raw : null;
}

/** Renders an inert confirmation page -- never mutates on GET. Corporate
 * email security scanners (Microsoft Defender Safe Links etc.) prefetch
 * every link in an inbound email to scan for phishing; if a bare GET
 * approved/rejected the batch, the scanner itself would silently decide it
 * before a human ever opened the message. Only the POST below (triggered by
 * a real button click on this page) performs the mutation. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const action = parseAction(searchParams.get("action"));

  if (!token || !action) {
    return htmlResponse(400, "Invalid link", `<p>This approval link is missing required information.</p>`);
  }

  const admin = createAdminClient();
  const tokenRow = await loadToken(admin, token);

  if (!tokenRow) {
    return htmlResponse(404, "Link not found", `<p>This approval link is invalid.</p>`);
  }

  if (tokenRow.status !== "pending") {
    const verb = tokenRow.resolved_action === "rejected" ? "rejected" : "approved";
    return htmlResponse(200, "Already decided", `<p>This batch was already ${verb}.</p>${OPEN_LINK}`);
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    await admin.from("backlog_approval_tokens").update({ status: "expired" }).eq("id", tokenRow.id);
    return htmlResponse(200, "Link expired", `<p>This approval link has expired. Please open Objectra to act on this item.</p>${OPEN_LINK}`);
  }

  const { data: project } = await admin.from("projects").select("name").eq("id", tokenRow.project_id).maybeSingle();
  const count = tokenRow.item_ids.length;
  const verb = action === "approve" ? "Approve" : "Reject";

  return htmlResponse(
    200,
    `${verb} ${tokenRow.batch_ref}`,
    `
      <h1 style="font-size:20px;font-weight:700;color:${HEADING};margin:0 0 12px;">${verb} ${count} item${count === 1 ? "" : "s"}?</h1>
      <p style="margin:0 0 24px;">Batch <strong>${escapeHtml(tokenRow.batch_ref)}</strong> for <strong>${escapeHtml(project?.name ?? "this project")}</strong>.</p>
      <form method="POST" action="/api/backlog-approval">
        <input type="hidden" name="token" value="${escapeHtml(token)}" />
        <input type="hidden" name="action" value="${action}" />
        <button type="submit" style="background:${action === "approve" ? GOLD_DARK : REJECT_RED};color:#ffffff;border:0;border-radius:10px;padding:13px 24px;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;">
          Confirm ${verb}
        </button>
      </form>
    `,
  );
}

/** Performs the actual status change -- only reached via the Confirm button
 * on the GET page above, never directly from the email link itself. */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "");
  const action = parseAction(String(formData.get("action") ?? ""));

  if (!token || !action) {
    return htmlResponse(400, "Invalid request", `<p>This request is missing required information.</p>`);
  }

  const admin = createAdminClient();
  const tokenRow = await loadToken(admin, token);

  if (!tokenRow) {
    return htmlResponse(404, "Link not found", `<p>This approval link is invalid.</p>`);
  }

  if (tokenRow.status !== "pending") {
    const verb = tokenRow.resolved_action === "rejected" ? "rejected" : "approved";
    return htmlResponse(200, "Already decided", `<p>This batch was already ${verb}.</p>${OPEN_LINK}`);
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    await admin.from("backlog_approval_tokens").update({ status: "expired" }).eq("id", tokenRow.id);
    return htmlResponse(200, "Link expired", `<p>This approval link has expired. Please open Objectra to act on this item.</p>${OPEN_LINK}`);
  }

  const newStatus = action === "approve" ? "approved" : "rejected";
  const today = new Date().toISOString().slice(0, 10);

  const { data: updated, error } = await admin
    .from("backlog_items")
    .update({ status: newStatus, approval_date: newStatus === "approved" ? today : null })
    .eq("project_id", tokenRow.project_id)
    .eq("status", "sent_for_approval")
    .in("id", tokenRow.item_ids)
    .select("id, dev_days, fiori_days, func_days");

  if (error) {
    return htmlResponse(500, "Something went wrong", `<p>We couldn't record your decision. Please try again from Objectra.</p>${OPEN_LINK}`);
  }

  const decidedRows = (updated ?? []) as Array<{ id: string; dev_days: number; fiori_days: number; func_days: number }>;

  // Mark the token spent regardless of whether any items were still
  // sent_for_approval -- either way this link can't be replayed.
  await admin
    .from("backlog_approval_tokens")
    .update({ status: "used", resolved_action: newStatus, used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  if (decidedRows.length === 0) {
    return htmlResponse(200, "Already decided", `<p>This has already been decided in Objectra.</p>${OPEN_LINK}`);
  }

  const totalDays = decidedRows.reduce((sum, r) => sum + r.dev_days + r.fiori_days + r.func_days, 0);

  await admin.from("backlog_approval_log").insert({
    project_id: tokenRow.project_id,
    batch_ref: tokenRow.batch_ref,
    item_ids: decidedRows.map((r) => r.id),
    action: newStatus,
    actor_id: null,
    total_days: totalDays,
    note: "Decided via email link",
  });

  const { data: project } = await admin.from("projects").select("name").eq("id", tokenRow.project_id).maybeSingle();
  const verb = newStatus === "approved" ? "Approved" : "Rejected";

  return htmlResponse(
    200,
    `${verb} ${tokenRow.batch_ref}`,
    `
      <h1 style="font-size:20px;font-weight:700;color:${HEADING};margin:0 0 12px;">${verb} ${decidedRows.length} item${decidedRows.length === 1 ? "" : "s"}</h1>
      <p style="margin:0;">for <strong>${escapeHtml(project?.name ?? "the project")}</strong>. Objectra has been updated.</p>
      ${OPEN_LINK}
    `,
  );
}

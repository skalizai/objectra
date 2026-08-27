import { createHash, createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyTicketCreated } from "@/lib/email/notify-ticket";
import { notifyTeamsTicketCreated } from "@/lib/teams/notify-teams";
import { ticketConfirmationCard, statusReplyCard, usageCard, rejectionCard, type AdaptiveCard } from "@/lib/teams/cards";
import type { TeamsConnection, Ticket, TicketCriticality } from "@/lib/types/database";

type Admin = ReturnType<typeof createAdminClient>;

const CRITICALITY_MAP: Record<string, TicketCriticality> = {
  p1: "P1_critical",
  p2: "P2_high",
  p3: "P3_medium",
  p4: "P4_low",
};

/** Bot Framework Activity, trimmed to the fields an Outgoing Webhook
 * payload is documented to include. Exact team/channel field paths vary
 * enough across tenants that this route deliberately doesn't key off them
 * for connection lookup (see verifyAndResolve below) -- only for the
 * best-effort deep link back to the original message. */
interface InboundActivity {
  id?: string;
  text?: string;
  from?: { name?: string };
  conversation?: { id?: string };
  channelData?: { teamsChannelId?: string };
}

function wrapReply(card: AdaptiveCard, fallbackText: string) {
  return {
    type: "message",
    text: fallbackText,
    attachments: [{ contentType: "application/vnd.microsoft.card.adaptive", content: card }],
  };
}

function reply(card: AdaptiveCard, fallbackText: string) {
  return NextResponse.json(wrapReply(card, fallbackText));
}

/** Teams shows the Outgoing Webhook's security token as Base64 -- the raw
 * bytes it decodes to are the actual HMAC key, not the Base64 string
 * itself. Mirrors the exact algorithm Teams uses to sign the request. */
function verifyHmac(rawBody: string, header: string | null, secretBase64: string): boolean {
  if (!header?.startsWith("HMAC ")) return false;
  const provided = header.slice(5);
  const key = Buffer.from(secretBase64, "base64");
  const expected = createHmac("sha256", key).update(rawBody, "utf8").digest("base64");

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** The HMAC secret is already per-project, so instead of trusting a
 * possibly-inconsistent team/channel id field from the payload, this tries
 * the signature against every active connection's secret -- the one that
 * verifies IS the target project. Small N (one row per connected project). */
async function resolveConnection(admin: Admin, rawBody: string, authHeader: string | null): Promise<TeamsConnection | null> {
  const { data } = await admin.from("teams_connections").select("*").eq("is_active", true);
  for (const row of (data ?? []) as TeamsConnection[]) {
    if (row.inbound_hmac_secret && verifyHmac(rawBody, authHeader, row.inbound_hmac_secret)) {
      return row;
    }
  }
  return null;
}

async function logInbound(
  admin: Admin,
  projectId: string,
  event: string,
  status: "ok" | "failed",
  rawBody: string,
  ticketId?: string,
  error?: string,
) {
  await admin.from("integration_log").insert({
    project_id: projectId,
    direction: "inbound",
    event,
    ticket_id: ticketId ?? null,
    status,
    error: error ?? null,
    payload_digest: createHash("sha256").update(rawBody).digest("hex"),
  });
}

interface ResolvedSender {
  profileId: string;
  fullName: string;
}

/** Best-effort identity match: Teams Outgoing Webhook payloads aren't
 * guaranteed to carry a usable email/UPN claim, so this falls back to
 * matching the sender's display name against active project members --
 * documented Tier-A limitation (Tier B's Bot Framework/Entra SSO path
 * gets a reliable claim instead). No match, or more than one, means no
 * ticket is created -- ambiguity is never resolved by guessing. */
async function resolveSender(admin: Admin, projectId: string, senderName: string | undefined): Promise<ResolvedSender | null> {
  if (!senderName?.trim()) return null;
  const needle = senderName.trim().toLowerCase();

  const { data: members } = await admin
    .from("project_members")
    .select("profile_id, profile:profiles(id, full_name)")
    .eq("project_id", projectId)
    .eq("is_active", true);

  const candidates = ((members ?? []) as unknown as { profile: { id: string; full_name: string } | null }[])
    .map((m) => m.profile)
    .filter((p): p is { id: string; full_name: string } => !!p && p.full_name.trim().toLowerCase() === needle);

  if (candidates.length !== 1) return null;
  return { profileId: candidates[0].id, fullName: candidates[0].full_name };
}

/** Re-implements tickets_insert's RLS check in code -- the admin client
 * bypasses RLS entirely, so this is the only place the rule actually runs
 * for a Teams-originated ticket. */
async function authorizeRaiser(admin: Admin, projectId: string, profileId: string): Promise<boolean> {
  const { data: profile } = await admin.from("profiles").select("is_org_admin").eq("id", profileId).maybeSingle();
  if (profile?.is_org_admin) return true;

  const { data: membership } = await admin
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("profile_id", profileId)
    .eq("is_active", true)
    .maybeSingle();

  return !!membership && ["project_manager", "technical_lead", "super_user"].includes(membership.role as string);
}

function messageLink(activity: InboundActivity): string | null {
  const channelId = activity.channelData?.teamsChannelId;
  if (!channelId || !activity.id) return null;
  return `https://teams.microsoft.com/l/message/${encodeURIComponent(channelId)}/${encodeURIComponent(activity.id)}`;
}

function stripMention(text: string): string {
  return text.replace(/<at>.*?<\/at>/gi, "").trim();
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const admin = createAdminClient();

  const connection = await resolveConnection(admin, rawBody, request.headers.get("authorization"));
  if (!connection) {
    // Can't attribute an unverified request to any project -- nothing to log it against.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let activity: InboundActivity;
  try {
    activity = JSON.parse(rawBody);
  } catch {
    await logInbound(admin, connection.project_id, "malformed", "failed", rawBody, undefined, "Invalid JSON body");
    return reply(rejectionCard("That message couldn't be read."), "That message couldn't be read.");
  }

  const command = stripMention(activity.text ?? "");
  const [verb, ...rest] = command.split(/\s+/);

  const { data: project } = await admin
    .from("projects")
    .select("id, name, phase, org_id")
    .eq("id", connection.project_id)
    .maybeSingle();
  if (!project) {
    await logInbound(admin, connection.project_id, "config_error", "failed", rawBody, undefined, "Project not found");
    return reply(rejectionCard("This connection's project no longer exists."), "This connection's project no longer exists.");
  }

  if (verb?.toLowerCase() === "status") {
    const ticketNo = rest[0];
    const { data: ticketRow } = await admin
      .from("tickets")
      .select("*")
      .eq("project_id", project.id)
      .eq("ticket_no", ticketNo)
      .maybeSingle();
    if (!ticketRow) {
      await logInbound(admin, project.id, "status_command", "failed", rawBody, undefined, "Ticket not found");
      return reply(rejectionCard(`No ticket found with number ${ticketNo ?? "(none given)"}.`), "Ticket not found.");
    }
    const ticket = ticketRow as Ticket;

    const sender = await resolveSender(admin, project.id, activity.from?.name);
    const canRead =
      !!sender &&
      ((await authorizeRaiser(admin, project.id, sender.profileId)) ||
        ticket.raised_by === sender.profileId ||
        ticket.assigned_to === sender.profileId);
    if (!canRead) {
      await logInbound(admin, project.id, "status_command", "failed", rawBody, ticket.id, "Not authorized");
      return reply(rejectionCard("You don't have access to that ticket."), "Not authorized.");
    }

    let assigneeName: string | null = null;
    if (ticket.assigned_to) {
      const { data: p } = await admin.from("profiles").select("full_name").eq("id", ticket.assigned_to).maybeSingle();
      assigneeName = p?.full_name ?? null;
    }
    await logInbound(admin, project.id, "status_command", "ok", rawBody, ticket.id);
    return reply(statusReplyCard(ticket, assigneeName), `${ticket.ticket_no}: ${ticket.status}`);
  }

  if (verb?.toLowerCase() !== "ticket") {
    const { data: modules } = await admin
      .from("picklists")
      .select("value")
      .eq("org_id", project.org_id)
      .eq("type", "module")
      .eq("is_active", true);
    await logInbound(admin, project.id, "help", "ok", rawBody);
    return reply(usageCard((modules ?? []).map((m) => m.value as string)), "Objectra bot commands.");
  }

  // "ticket <module> <p1-4> <subject...>"
  const moduleToken = rest[0];
  const criticalityToken = rest[1]?.toLowerCase();
  const subject = rest.slice(2).join(" ").trim();
  const criticality = criticalityToken ? CRITICALITY_MAP[criticalityToken] : undefined;

  if (!moduleToken || !criticality || !subject) {
    const { data: modules } = await admin
      .from("picklists")
      .select("value")
      .eq("org_id", project.org_id)
      .eq("type", "module")
      .eq("is_active", true);
    await logInbound(admin, project.id, "ticket_command", "failed", rawBody, undefined, "Malformed command");
    return reply(
      usageCard((modules ?? []).map((m) => m.value as string)),
      "Usage: @Objectra ticket <module> <p1|p2|p3|p4> <subject>",
    );
  }

  if (project.phase !== "hypercare" && project.phase !== "support") {
    await logInbound(admin, project.id, "ticket_command", "failed", rawBody, undefined, "Project not in hypercare/support");
    return reply(
      rejectionCard("Tickets can't be raised while this project is in Implementation phase."),
      "Tickets can't be raised right now.",
    );
  }

  const sender = await resolveSender(admin, project.id, activity.from?.name);
  if (!sender) {
    await logInbound(admin, project.id, "ticket_command", "failed", rawBody, undefined, "No matching project member");
    return reply(
      rejectionCard(`Couldn't match "${activity.from?.name ?? "you"}" to someone invited to this project. Ask your PM to invite you, then try again.`),
      "Not invited to this project.",
    );
  }

  const authorized = await authorizeRaiser(admin, project.id, sender.profileId);
  if (!authorized) {
    await logInbound(admin, project.id, "ticket_command", "failed", rawBody, undefined, "Not authorized to raise tickets");
    return reply(rejectionCard(`${sender.fullName} doesn't have permission to raise tickets on this project.`), "Not authorized.");
  }

  const sourceMessageId = activity.id ?? null;

  // Idempotency: a retried/duplicated Teams message hits the unique index
  // on (project_id, source_message_id) -- caught below and treated as
  // "already created" rather than an error.
  const { data: inserted, error: insertError } = await admin
    .from("tickets")
    .insert({
      project_id: project.id,
      module: moduleToken,
      criticality,
      subject,
      category: "incident",
      raised_by: sender.profileId,
      source: "teams",
      source_conversation_id: activity.conversation?.id ?? null,
      source_message_id: sourceMessageId,
      source_message_link: messageLink(activity),
    })
    .select("*")
    .single();

  let ticket: Ticket;
  if (insertError) {
    if (insertError.code === "23505" && sourceMessageId) {
      const { data: existing } = await admin
        .from("tickets")
        .select("*")
        .eq("project_id", project.id)
        .eq("source_message_id", sourceMessageId)
        .maybeSingle();
      if (!existing) {
        await logInbound(admin, project.id, "ticket_command", "failed", rawBody, undefined, insertError.message);
        return reply(rejectionCard("Something went wrong creating that ticket."), "Something went wrong.");
      }
      ticket = existing as Ticket;
    } else {
      await logInbound(admin, project.id, "ticket_command", "failed", rawBody, undefined, insertError.message);
      return reply(rejectionCard("Something went wrong creating that ticket."), "Something went wrong.");
    }
  } else {
    ticket = inserted as Ticket;
    await notifyTicketCreated(ticket.id);
    await notifyTeamsTicketCreated(ticket.id);
  }

  let assigneeName: string | null = null;
  if (ticket.assigned_to) {
    const { data: p } = await admin.from("profiles").select("full_name").eq("id", ticket.assigned_to).maybeSingle();
    assigneeName = p?.full_name ?? null;
  }

  await logInbound(admin, project.id, "ticket_command", "ok", rawBody, ticket.id);
  return reply(ticketConfirmationCard(ticket, assigneeName), `Created ${ticket.ticket_no}`);
}

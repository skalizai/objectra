import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient, EMAIL_FROM } from "@/lib/email/resend";
import TicketCreatedEmail from "@/emails/ticket-created-email";
import TicketAssignedEmail from "@/emails/ticket-assigned-email";
import TicketStatusEmail from "@/emails/ticket-status-email";
import SlaAlertEmail from "@/emails/sla-alert-email";
import { CRITICALITY_COLOR } from "@/emails/components/criticality";
import type { EmailType, Ticket } from "@/lib/types/database";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

type Admin = ReturnType<typeof createAdminClient>;

async function logEmail(
  admin: Admin,
  type: EmailType,
  toEmail: string,
  subject: string,
  projectId: string,
  sendResult: { data?: { id?: string } | null; error?: { message: string } | null },
) {
  await admin.from("email_log").insert({
    type,
    to_email: toEmail,
    subject,
    project_id: projectId,
    status: sendResult.error ? "failed" : "sent",
    provider_id: sendResult.data?.id ?? null,
    error: sendResult.error?.message ?? null,
  });
}

async function logEmailFailure(admin: Admin, type: EmailType, toEmail: string, subject: string, projectId: string, err: unknown) {
  await admin.from("email_log").insert({
    type,
    to_email: toEmail,
    subject,
    project_id: projectId,
    status: "failed",
    error: err instanceof Error ? err.message : "Unknown error",
  });
}

/** Resolves a profile's email/name plus whether they've opted out of
 * notifications via their resources roster entry — a profile with no
 * resources row (typical for a super_user raiser, unlike an internal
 * consultant) is treated as opted in by default. */
async function getContact(admin: Admin, profileId: string | null) {
  if (!profileId) return null;
  const [{ data: profile }, { data: resource }] = await Promise.all([
    admin.from("profiles").select("email, full_name").eq("id", profileId).maybeSingle(),
    admin.from("resources").select("email_notifications_enabled").eq("profile_id", profileId).maybeSingle(),
  ]);
  if (!profile?.email) return null;
  const optedOut = resource ? resource.email_notifications_enabled === false : false;
  return { email: profile.email as string, fullName: (profile.full_name as string) || "there", optedOut };
}

async function getProjectEditorEmails(admin: Admin, projectId: string): Promise<string[]> {
  const { data: members } = await admin
    .from("project_members")
    .select("profile:profiles(email)")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .in("role", ["project_manager", "technical_lead"]);

  return Array.from(
    new Set(
      ((members ?? []) as unknown as { profile: { email: string } | null }[])
        .map((m) => m.profile?.email)
        .filter((e): e is string => !!e),
    ),
  );
}

async function getTicketContext(admin: Admin, ticketId: string) {
  const { data: ticket } = await admin.from("tickets").select("*").eq("id", ticketId).maybeSingle();
  if (!ticket) return null;
  const { data: project } = await admin
    .from("projects")
    .select("id, name, org_id")
    .eq("id", (ticket as Ticket).project_id)
    .maybeSingle();
  if (!project) return null;

  const { data: settings } = await admin
    .from("notification_settings")
    .select("ticket_emails_enabled")
    .eq("project_id", project.id)
    .maybeSingle();
  if (settings && settings.ticket_emails_enabled === false) return null;

  return { ticket: ticket as Ticket, project };
}

/** Fires right after createTicket() inserts the row: confirms receipt to
 * the raiser, then (if auto-routing found a consultant) notifies the
 * assignee the same way a later reassignment would. */
export async function notifyTicketCreated(ticketId: string) {
  if (!process.env.RESEND_API_KEY) return;
  const admin = createAdminClient();

  const ctx = await getTicketContext(admin, ticketId);
  if (!ctx) return;
  const { ticket, project } = ctx;

  const raiser = await getContact(admin, ticket.raised_by);
  if (raiser && !raiser.optedOut) {
    const assignee = ticket.assigned_to ? await getContact(admin, ticket.assigned_to) : null;
    const subject = `Ticket received — ${ticket.ticket_no ?? ticket.subject} (${project.name})`;
    try {
      const result = await getResendClient().emails.send({
        from: EMAIL_FROM,
        to: [raiser.email],
        subject,
        react: TicketCreatedEmail({
          recipientName: raiser.fullName,
          ticketNo: ticket.ticket_no ?? "",
          subject: ticket.subject,
          module: ticket.module,
          criticality: ticket.criticality,
          projectName: project.name,
          assignedToName: assignee?.fullName ?? null,
          appUrl: APP_URL,
        }),
      });
      await logEmail(admin, "ticket_created", raiser.email, subject, project.id, result);
    } catch (err) {
      await logEmailFailure(admin, "ticket_created", raiser.email, subject, project.id, err);
    }
  }

  if (ticket.assigned_to) {
    await notifyTicketAssignment(ticketId);
  }
}

/** Fires on initial auto-routing (from notifyTicketCreated) and on manual
 * reassignment (reassignTicket action) — notifies the newly assigned
 * consultant plus the project's PM/technical_lead(s). */
export async function notifyTicketAssignment(ticketId: string) {
  if (!process.env.RESEND_API_KEY) return;
  const admin = createAdminClient();

  const ctx = await getTicketContext(admin, ticketId);
  if (!ctx) return;
  const { ticket, project } = ctx;
  if (!ticket.assigned_to) return;

  const assignee = await getContact(admin, ticket.assigned_to);
  if (!assignee || assignee.optedOut) return;

  const raiser = await getContact(admin, ticket.raised_by);
  const editorEmails = await getProjectEditorEmails(admin, project.id);
  const ccSet = new Set(editorEmails);
  ccSet.delete(assignee.email);

  const subject = `${ticket.ticket_no ?? "Ticket"} routed to you — ${ticket.subject} (${project.name})`;
  try {
    const result = await getResendClient().emails.send({
      from: EMAIL_FROM,
      to: [assignee.email],
      cc: ccSet.size ? Array.from(ccSet) : undefined,
      subject,
      react: TicketAssignedEmail({
        recipientName: assignee.fullName,
        ticketNo: ticket.ticket_no ?? "",
        subject: ticket.subject,
        module: ticket.module,
        criticality: ticket.criticality,
        projectName: project.name,
        raisedByName: raiser?.fullName ?? null,
        slaDueAt: ticket.sla_due_at,
        appUrl: APP_URL,
      }),
    });
    await logEmail(admin, "ticket_assigned", assignee.email, subject, project.id, result);
  } catch (err) {
    await logEmailFailure(admin, "ticket_assigned", assignee.email, subject, project.id, err);
  }
}

/** Notifies the raiser of a status change — external-safe content only
 * (no resolution_note/internal comment text), per section 18. */
export async function notifyTicketStatusChange(ticketId: string, previousStatus: string, newStatus: string) {
  if (!process.env.RESEND_API_KEY) return;
  const admin = createAdminClient();

  const ctx = await getTicketContext(admin, ticketId);
  if (!ctx) return;
  const { ticket, project } = ctx;

  const raiser = await getContact(admin, ticket.raised_by);
  if (!raiser || raiser.optedOut) return;

  const color = CRITICALITY_COLOR[ticket.criticality] ?? "#8a8271";
  const subject = `${ticket.ticket_no ?? "Ticket"} is now ${newStatus.replace(/_/g, " ")} — ${ticket.subject}`;
  try {
    const result = await getResendClient().emails.send({
      from: EMAIL_FROM,
      to: [raiser.email],
      subject,
      react: TicketStatusEmail({
        recipientName: raiser.fullName,
        ticketNo: ticket.ticket_no ?? "",
        subject: ticket.subject,
        projectName: project.name,
        previousStatus,
        newStatus,
        statusColor: color,
        appUrl: APP_URL,
      }),
    });
    await logEmail(admin, "ticket_status", raiser.email, subject, project.id, result);
  } catch (err) {
    await logEmailFailure(admin, "ticket_status", raiser.email, subject, project.id, err);
  }
}

/** Called by the sla-scan job (lib/jobs/sla-scan.ts) — one email per
 * recipient (assignee + PM/technical_lead), grouped per ticket. */
export async function notifySlaAlert(ticketId: string, isWarning: boolean) {
  if (!process.env.RESEND_API_KEY) return;
  const admin = createAdminClient();

  const { data: settings } = await admin
    .from("tickets")
    .select("project_id")
    .eq("id", ticketId)
    .maybeSingle();
  if (!settings) return;

  const { data: notifSettings } = await admin
    .from("notification_settings")
    .select("sla_alerts_enabled")
    .eq("project_id", settings.project_id)
    .maybeSingle();
  if (notifSettings && notifSettings.sla_alerts_enabled === false) return;

  const { data: ticketRow } = await admin.from("tickets").select("*").eq("id", ticketId).maybeSingle();
  if (!ticketRow) return;
  const ticket = ticketRow as Ticket;
  if (!ticket.sla_due_at) return;

  const { data: project } = await admin.from("projects").select("id, name").eq("id", ticket.project_id).maybeSingle();
  if (!project) return;

  const recipients = new Set<string>();
  const assignee = await getContact(admin, ticket.assigned_to);
  if (assignee && !assignee.optedOut) recipients.add(assignee.email);
  for (const email of await getProjectEditorEmails(admin, project.id)) recipients.add(email);

  const subject = `${isWarning ? "SLA due soon" : "SLA breached"}: ${ticket.ticket_no ?? "Ticket"} — ${ticket.subject}`;
  for (const email of recipients) {
    try {
      const result = await getResendClient().emails.send({
        from: EMAIL_FROM,
        to: [email],
        subject,
        react: SlaAlertEmail({
          recipientName: assignee?.email === email ? assignee.fullName : "there",
          ticketNo: ticket.ticket_no ?? "",
          subject: ticket.subject,
          projectName: project.name,
          criticality: ticket.criticality,
          slaDueAt: ticket.sla_due_at,
          isWarning,
          appUrl: APP_URL,
        }),
      });
      await logEmail(admin, "sla_alert", email, subject, project.id, result);
    } catch (err) {
      await logEmailFailure(admin, "sla_alert", email, subject, project.id, err);
    }
  }
}

/** "Send test ticket email" (Settings -> Support) — ticket emails are
 * event-driven, not job-driven, so unlike sendTestDigest() this can't
 * re-run a real job with a force flag; it builds a fixture and sends
 * directly. Intentional deviation from the digest test-send pattern. */
export async function sendTestTicketEmail(
  projectId: string,
  toEmail: string,
): Promise<{ sent: boolean; error: string | null }> {
  if (!process.env.RESEND_API_KEY) return { sent: false, error: "Resend is not configured." };
  const admin = createAdminClient();

  const { data: project } = await admin.from("projects").select("id, name").eq("id", projectId).maybeSingle();
  if (!project) return { sent: false, error: "Project not found." };

  const subject = `Test ticket notification — ${project.name}`;
  try {
    const result = await getResendClient().emails.send({
      from: EMAIL_FROM,
      to: [toEmail],
      subject,
      react: TicketCreatedEmail({
        recipientName: "there",
        ticketNo: "TEST-INC-00000",
        subject: "This is a test ticket notification",
        module: "MM",
        criticality: "P3_medium",
        projectName: project.name,
        assignedToName: "Your consultant",
        appUrl: APP_URL,
      }),
    });
    await logEmail(admin, "ticket_created", toEmail, subject, projectId, result);
    if (result.error) return { sent: false, error: result.error.message };
    return { sent: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await logEmailFailure(admin, "ticket_created", toEmail, subject, projectId, err);
    return { sent: false, error: message };
  }
}

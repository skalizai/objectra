"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/auth/get-viewer";
import { getResendClient, EMAIL_FROM } from "@/lib/email/resend";
import InviteEmail from "@/emails/invite-email";
import type { InvitationRole, Resource } from "@/lib/types/database";

export interface InviteResourceState {
  error: string | null;
  success: boolean;
}

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

/** Sends the actual login invite for an already-saved resource (see
 * lib/actions/resources.ts) — the separate second step the roster's
 * "Invite" button triggers: creates the auth account, project_members
 * entry, and emails the action link, then links the resource row to the
 * new profile so the roster shows it as invited. */
export async function inviteResourceRecord(
  resourceId: string,
  _prevState: InviteResourceState,
  formData: FormData,
): Promise<InviteResourceState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Not signed in.", success: false };

  const projectId = String(formData.get("project_id") ?? "").trim();
  const role = String(formData.get("role") ?? "") as InvitationRole;
  const allocationPct = Number(formData.get("allocation_pct") ?? 0);

  if (!projectId || !role) {
    return { error: "Project and access level are required.", success: false };
  }

  const supabase = await createClient();
  const [{ data: resource }, { data: project }] = await Promise.all([
    supabase.from("resources").select("*").eq("id", resourceId).single(),
    supabase.from("projects").select("id, name").eq("id", projectId).single(),
  ]);

  if (!resource) return { error: "Resource not found.", success: false };
  if (!project) return { error: "Project not found or not accessible.", success: false };

  const resourceRow = resource as Resource;

  const { data: invitation, error: inviteError } = await supabase
    .from("invitations")
    .insert({
      org_id: viewer.profile.org_id,
      project_id: projectId,
      email: resourceRow.email,
      full_name: resourceRow.full_name,
      role,
      allocation_pct: allocationPct,
      invited_by: viewer.user.id,
    })
    .select("id, token")
    .single();

  if (inviteError || !invitation) {
    return { error: inviteError?.message ?? "Could not create invitation.", success: false };
  }

  const admin = createAdminClient();
  const nextPath = `/accept-invite?invite=${invitation.token}`;

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email: resourceRow.email,
    options: {
      data: {
        org_id: viewer.profile.org_id,
        full_name: resourceRow.full_name,
        is_org_admin: false,
        consultant_type: resourceRow.consultant_type,
        role_title: resourceRow.role_title,
        primary_module: resourceRow.primary_module,
        location: resourceRow.location,
      },
      redirectTo: `${APP_URL}/auth/confirm?next=${encodeURIComponent(nextPath)}`,
    },
  });

  if (linkError || !linkData) {
    return { error: linkError?.message ?? "Could not generate invite link.", success: false };
  }

  const actionUrl = linkData.properties.action_link;
  const subject = `You're invited to ${project.name} on Objectra Labs`;

  try {
    const sendResult = await getResendClient().emails.send({
      from: EMAIL_FROM,
      to: resourceRow.email,
      subject,
      react: InviteEmail({
        inviteeName: resourceRow.full_name,
        inviterName: viewer.profile.full_name,
        projectName: project.name,
        role,
        actionUrl,
      }),
    });

    await admin.from("email_log").insert({
      type: "invite",
      to_email: resourceRow.email,
      subject,
      project_id: projectId,
      status: sendResult.error ? "failed" : "sent",
      provider_id: sendResult.data?.id ?? null,
      error: sendResult.error?.message ?? null,
    });

    if (sendResult.error) {
      return { error: sendResult.error.message, success: false };
    }
  } catch (err) {
    await admin.from("email_log").insert({
      type: "invite",
      to_email: resourceRow.email,
      subject,
      project_id: projectId,
      status: "failed",
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return { error: "Failed to send invite email.", success: false };
  }

  // linkData.user is the freshly-created (unconfirmed) auth user —
  // generateLink({type:'invite'}) creates the account immediately, which
  // fires handle_new_user() and gives us a profiles row to link right away.
  await admin
    .from("resources")
    .update({ profile_id: linkData.user.id, invite_status: "invited" })
    .eq("id", resourceId);

  revalidatePath("/resources");
  return { error: null, success: true };
}

"use server";

import { randomInt } from "crypto";
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

// Excludes visually ambiguous characters (0/O, 1/l/I) since this gets
// typed by hand from an email, not pasted from a password manager.
const PASSWORD_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generatePassword(length = 12): string {
  let password = "";
  for (let i = 0; i < length; i++) password += PASSWORD_CHARSET[randomInt(PASSWORD_CHARSET.length)];
  return password;
}

/**
 * Creates the login for an already-saved resource, and grants them access
 * to the given project — or, if they're already invited, resets their
 * password and re-sends it (safe to run repeatedly: lost the email, adding
 * them to a second project, etc).
 *
 * Unlike the original "click a link, set your own password" flow, this
 * generates the password itself and emails it directly alongside the
 * login email, so the resource can sign in immediately with no separate
 * acceptance step.
 */
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
  const admin = createAdminClient();
  const password = generatePassword();
  const isResend = !!resourceRow.profile_id;
  let userId = resourceRow.profile_id;

  if (isResend && userId) {
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password });
    if (updateError) return { error: updateError.message, success: false };
  } else {
    // Inserts into auth.users directly, which fires handle_new_user() the
    // same as the old generateLink({type:'invite'}) path did — just with a
    // real password set and the email pre-confirmed, so there's no
    // separate "click the link, set a password" step.
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: resourceRow.email,
      password,
      email_confirm: true,
      user_metadata: {
        org_id: viewer.profile.org_id,
        full_name: resourceRow.full_name,
        is_org_admin: false,
        consultant_type: resourceRow.consultant_type,
        role_title: resourceRow.role_title,
        primary_module: resourceRow.primary_module,
        location: resourceRow.location,
      },
    });
    if (createError || !created.user) {
      return { error: createError?.message ?? "Could not create the login.", success: false };
    }
    userId = created.user.id;
  }

  // Same effect as accept_invitation()'s project-membership branch
  // (0002_functions_triggers.sql), applied immediately with the
  // service-role client instead of waiting for the invitee to accept a
  // link themselves.
  if (role === "org_admin") {
    await admin.from("profiles").update({ is_org_admin: true }).eq("id", userId);
  } else {
    await admin
      .from("project_members")
      .upsert(
        { project_id: projectId, profile_id: userId, role, allocation_pct: allocationPct, is_active: true },
        { onConflict: "project_id,profile_id" },
      );
  }

  // Kept for audit history (who was granted what role, when) — there's no
  // "pending" window with this flow, so it's recorded as already accepted.
  await admin.from("invitations").insert({
    org_id: viewer.profile.org_id,
    project_id: projectId,
    email: resourceRow.email,
    full_name: resourceRow.full_name,
    role,
    allocation_pct: allocationPct,
    invited_by: viewer.user.id,
    status: "accepted",
  });

  const subject = isResend
    ? `Your Objectra Labs password was reset`
    : `You're invited to ${project.name} on Objectra Labs`;

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
        loginEmail: resourceRow.email,
        password,
        signInUrl: `${APP_URL}/sign-in`,
        isResend,
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

  await admin.from("resources").update({ profile_id: userId, invite_status: "invited" }).eq("id", resourceId);

  revalidatePath("/resources");
  return { error: null, success: true };
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { AcceptInviteForm } from "@/components/auth/accept-invite-form";

export const metadata: Metadata = { title: "Accept invite" };

export default function AcceptInvitePage() {
  return (
    <AuthShell
      title="You're invited to Objectra Labs"
      subtitle="Set a password to finish creating your account."
    >
      <Suspense fallback={null}>
        <AcceptInviteForm />
      </Suspense>
    </AuthShell>
  );
}

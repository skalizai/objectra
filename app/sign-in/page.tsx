import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getViewer } from "@/lib/auth/get-viewer";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  const viewer = await getViewer();
  if (viewer) redirect("/dashboard");

  return (
    <AuthShell title="Sign in" subtitle="Welcome back. Sign in with your Objectra Labs account.">
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}

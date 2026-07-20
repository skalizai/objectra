import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-1 items-center justify-center px-6 py-16">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px]"
        style={{
          background:
            "radial-gradient(600px 280px at 50% -10%, color-mix(in srgb, var(--brass) 12%, transparent), transparent)",
        }}
      />

      <div className="w-full max-w-[400px]">
        <Link href="/" className="mb-8 flex items-center justify-center">
          <Logo height={30} />
        </Link>

        <div
          className="rounded-card border border-border bg-surface p-8"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <h1 className="font-display text-xl font-semibold">{title}</h1>
          <p className="mt-1.5 text-sm text-text-2">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

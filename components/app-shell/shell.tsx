"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { UserMenu } from "@/components/app-shell/user-menu";
import { SignOutButton } from "@/components/app-shell/sign-out-button";
import { PageTransition } from "@/components/app-shell/page-transition";
import { Logo } from "@/components/ui/logo";
import { NAV_BY_ROLE, type ViewerRole } from "@/lib/nav";

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center px-4 py-5">
      <Logo height={24} />
    </Link>
  );
}

export function AppShell({
  name,
  email,
  role,
  children,
}: {
  name: string;
  email: string;
  role: ViewerRole;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Icon components can't cross the server->client prop boundary (they're
  // functions, not serializable data) — NAV_BY_ROLE is looked up here,
  // inside client code, rather than passed in from the server layout.
  const navItems = NAV_BY_ROLE[role];

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className="hidden w-[236px] shrink-0 flex-col border-r border-border bg-sidebar drawer:flex"
      >
        <Brand />
        <SidebarNav items={navItems} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 drawer:hidden"
            />
            <motion.aside
              initial={{ x: -236 }}
              animate={{ x: 0 }}
              exit={{ x: -236 }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[236px] flex-col border-r border-border bg-sidebar drawer:hidden"
            >
              <div className="flex items-center justify-between pr-3">
                <Brand />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-control p-2 text-text-2 hover:bg-surface-2"
                  aria-label="Close menu"
                >
                  <IconX size={18} />
                </button>
              </div>
              <SidebarNav items={navItems} onNavigate={() => setMobileOpen(false)} />
              <div className="mt-auto border-t border-border p-3">
                <SignOutButton className="w-full" />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-control p-2 text-text-2 hover:bg-surface-2 drawer:hidden"
            aria-label="Open menu"
          >
            <IconMenu2 size={20} />
          </button>
          <span className="drawer:hidden" />
          <UserMenu name={name} email={email} role={role} />
        </header>

        <main className="mx-auto w-full max-w-[1220px] flex-1 px-4 py-8 sm:px-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}

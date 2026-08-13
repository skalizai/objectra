"use client";

import { useState, useRef, useEffect } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { SignOutButton } from "@/components/app-shell/sign-out-button";
import type { ViewerRole } from "@/lib/nav";

const ROLE_LABEL: Record<ViewerRole, string> = {
  org_admin: "Org admin",
  project_manager: "Project manager",
  technical_lead: "Technical lead",
  member: "Member",
  client: "Client",
  super_user: "Super user",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function UserMenu({ name, email, role }: { name: string; email: string; role: ViewerRole }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-control px-2 py-1.5 hover:bg-surface-2"
        aria-expanded={open}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-medium text-on-brass"
          style={{ background: "var(--brass)" }}
        >
          {initials(name) || "?"}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-tight">{name}</span>
          <span className="block text-xs leading-tight text-text-3">{ROLE_LABEL[role]}</span>
        </span>
        <IconChevronDown size={16} className="text-text-3" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-56 rounded-card border border-border bg-surface p-1.5"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="border-b border-border px-3 py-2">
              <div className="truncate text-sm font-medium">{name}</div>
              <div className="truncate text-xs text-text-3">{email}</div>
            </div>
            <SignOutButton className="mt-1 w-full" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function WorkspaceTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/projects/${projectId}`, label: "Overview", exact: true },
    { href: `/projects/${projectId}/objects`, label: "Objects register" },
    { href: `/projects/${projectId}/pipeline`, label: "Pipeline board" },
    { href: `/projects/${projectId}/assignments`, label: "Assignments" },
  ];

  return (
    <div className="flex gap-1 border-b border-border">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative px-4 py-3 text-sm font-medium transition-colors",
              active ? "text-text" : "text-text-2 hover:text-text",
            )}
          >
            {tab.label}
            {active && (
              <motion.span
                layoutId="workspace-tab-active"
                className="absolute inset-x-3 -bottom-px h-0.5 rounded-full"
                style={{ background: "var(--brass)" }}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}

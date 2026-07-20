"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import type { NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function SidebarNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "text-brass" : "text-text-2 hover:text-text hover:bg-surface-2",
            )}
          >
            {active && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-control bg-surface-2"
                style={{ boxShadow: "inset 0 0 0 1px var(--border-2)" }}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <item.icon size={18} className="relative z-10 shrink-0" stroke={1.75} />
            <span className="relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

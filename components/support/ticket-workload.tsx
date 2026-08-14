"use client";

import { motion } from "framer-motion";
import { IconAlertTriangle, IconUsers } from "@tabler/icons-react";
import type { SupportDashboardData } from "@/lib/data/support";

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

/** "Who's holding tickets" — open-ticket workload per consultant, busiest
 * first, with a proportional bar and an SLA-breach count so overload and
 * risk are both visible at a glance. */
export function TicketWorkload({ data }: { data: SupportDashboardData["workload"] }) {
  const max = Math.max(1, ...data.map((w) => w.open));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.48 }}
      className="rounded-card border border-border bg-surface p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-text">
        <IconUsers size={16} className="text-text-2" />
        Who&apos;s holding tickets
      </h3>

      {data.length === 0 ? (
        <p className="mt-8 text-center text-sm text-text-3">Nothing routed yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {data.map((w, i) => (
            <motion.li
              key={w.name}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
            >
              <div className="mb-1 flex items-center gap-2.5">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-medium text-on-brass"
                  style={{ background: "var(--brass)" }}
                >
                  {initials(w.name) || "?"}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-text-2">{w.name}</span>
                {w.breaching > 0 && (
                  <span className="flex shrink-0 items-center gap-1 text-xs" style={{ color: "var(--status-overdue)" }}>
                    <IconAlertTriangle size={12} />
                    {w.breaching}
                  </span>
                )}
                <span className="shrink-0 font-mono text-xs text-text-3">{w.open}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(w.open / max) * 100}%` }}
                  transition={{ duration: 0.6, delay: 0.1 * i, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: w.breaching > 0 ? "var(--status-overdue)" : "var(--brass)" }}
                />
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

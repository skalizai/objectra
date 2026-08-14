"use client";

import { motion } from "framer-motion";
import { IconMessageCircle } from "@tabler/icons-react";
import type { SupportDashboardData } from "@/lib/data/support";

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

/** Who's raising the most tickets, all-time — visibility into which
 * client contact/super user is generating the most support volume. */
export function TicketTopRaisers({ data }: { data: SupportDashboardData["topRaisers"] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.54 }}
      className="rounded-card border border-border bg-surface p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-text">
        <IconMessageCircle size={16} className="text-text-2" />
        Top raisers
      </h3>

      {data.length === 0 ? (
        <p className="mt-8 text-center text-sm text-text-3">No tickets raised yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {data.map((r, i) => (
            <motion.li
              key={r.name}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
              className="flex items-center gap-2.5 py-2"
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-medium text-on-brass"
                style={{ background: "var(--brass)" }}
              >
                {initials(r.name) || "?"}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-text-2">{r.name}</span>
              <span className="shrink-0 font-mono text-xs text-text-3">{r.count} raised</span>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

"use client";

import { motion } from "framer-motion";
import { differenceInHours, format } from "date-fns";
import { IconClockHour4 } from "@tabler/icons-react";
import { TicketGlyph } from "@/components/support/ticket-glyph";
import { CriticalityPill } from "@/components/support/criticality-pill";
import type { TicketWithNames } from "@/lib/data/support";

export function TicketDeadlineMonitor({ data }: { data: TicketWithNames[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6 }}
      className="rounded-card border border-border bg-surface p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-text">
        <IconClockHour4 size={16} className="text-text-2" />
        SLA deadline monitor
      </h3>

      {data.length === 0 ? (
        <p className="mt-8 text-center text-sm text-text-3">Nothing due — you&apos;re all caught up.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {data.map((t, i) => {
            const hours = t.sla_due_at ? differenceInHours(new Date(t.sla_due_at), new Date()) : null;
            return (
              <motion.li
                key={t.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * i }}
                whileHover={{ x: 2 }}
                className="flex items-center gap-3 py-2.5"
              >
                <TicketGlyph module={t.module} size={22} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-text">{t.subject}</div>
                  <div className="truncate text-xs text-text-3">
                    {t.ticket_no ?? "—"}
                    {t.assigned_to_name ? ` · ${t.assigned_to_name}` : " · Unrouted"}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-xs text-text-3">
                    {t.sla_due_at ? format(new Date(t.sla_due_at), "dd MMM, h:mm a") : "No due date"}
                  </div>
                  {hours !== null && (
                    <div className="text-xs" style={{ color: hours < 0 ? "var(--status-overdue)" : "var(--text-3)" }}>
                      {hours < 0 ? `${Math.abs(hours)}h overdue` : `${hours}h remaining`}
                    </div>
                  )}
                </div>
                <CriticalityPill criticality={t.criticality} className="hidden shrink-0 sm:inline-flex" />
              </motion.li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}

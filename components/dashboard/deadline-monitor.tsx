"use client";

import { motion } from "framer-motion";
import { differenceInCalendarDays, format } from "date-fns";
import { IconClockHour4 } from "@tabler/icons-react";
import { WricefGlyph } from "@/components/ui/wricef-glyph";
import { StatusPill } from "@/components/ui/status-pill";
import type { DashboardData } from "@/lib/data/dashboard";

export function DeadlineMonitor({ data }: { data: DashboardData["deadlineMonitor"] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.42 }}
      className="rounded-card border border-border bg-surface p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-text">
        <IconClockHour4 size={16} className="text-text-2" />
        Deadline monitor
      </h3>

      {data.length === 0 ? (
        <p className="mt-8 text-center text-sm text-text-3">Nothing due — you&apos;re all caught up.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {data.map((obj, i) => {
            const days = obj.due_date ? differenceInCalendarDays(new Date(obj.due_date), new Date()) : null;
            return (
              <motion.li
                key={obj.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * i }}
                whileHover={{ x: 2 }}
                className="flex items-center gap-3 py-2.5"
              >
                <WricefGlyph type={obj.object_type} size={22} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-text">{obj.title}</div>
                  <div className="truncate text-xs text-text-3">
                    {obj.project_name}
                    {obj.wricef_id ? ` · ${obj.wricef_id}` : ""}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-xs text-text-3">
                    {obj.due_date ? format(new Date(obj.due_date), "dd MMM yyyy") : "No due date"}
                  </div>
                  {days !== null && (
                    <div
                      className="text-xs"
                      style={{ color: days < 0 ? "var(--status-overdue)" : "var(--text-3)" }}
                    >
                      {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d remaining`}
                    </div>
                  )}
                </div>
                <StatusPill status={obj.status} dueDate={obj.due_date} className="hidden shrink-0 sm:inline-flex" />
              </motion.li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}

"use client";

import { motion } from "framer-motion";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface CategorySlice {
  label: string;
  count: number;
  color: string;
}

/** Generic donut + legend, reused for every Backlog category breakdown
 * (Module/LOB/Type/Package) -- same shape as TicketStatusDonut, but the
 * key set is open-ended here rather than a handful of fixed enum values,
 * so callers pass pre-resolved {label, count, color} slices (colors
 * assigned once from the full, unfiltered item set -- see
 * backlog-dashboard.tsx -- so a slice's color never changes when a
 * filter changes which slices are visible). */
export function BacklogCategoryDonut({
  title,
  caption,
  data,
  totalLabel,
  delay,
}: {
  title: string;
  caption?: string;
  data: CategorySlice[];
  totalLabel: string;
  delay: number;
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-card border border-border bg-surface p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h3 className="font-display text-sm font-semibold text-text">{title}</h3>
      {caption && <p className="mt-0.5 text-xs text-text-3">{caption}</p>}

      {total === 0 ? (
        <p className="mt-8 text-center text-sm text-text-3">Nothing to show yet.</p>
      ) : (
        <div className="mt-2 flex items-center gap-6">
          <div className="relative h-[160px] w-[160px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="count" nameKey="label" innerRadius={52} outerRadius={76} paddingAngle={2} strokeWidth={0} animationDuration={600}>
                  {data.map((entry) => (
                    <Cell key={entry.label} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border-2)", borderRadius: 10, fontSize: 12, color: "var(--text)" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl font-semibold">{total}</span>
              <span className="text-xs text-text-3">{totalLabel}</span>
            </div>
          </div>

          <ul className="flex-1 space-y-2 overflow-hidden">
            {data.map((entry) => (
              <li key={entry.label} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-text-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: entry.color }} />
                  <span className="truncate">{entry.label}</span>
                </span>
                <span className="shrink-0 font-mono text-text">{entry.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

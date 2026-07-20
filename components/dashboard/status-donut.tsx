"use client";

import { motion } from "framer-motion";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useStatuses } from "@/components/providers/picklist-provider";
import { resolveStatusColor } from "@/lib/object-meta";
import type { DashboardData } from "@/lib/data/dashboard";

export function StatusDonut({ data }: { data: DashboardData["statusDistribution"] }) {
  const statuses = useStatuses();
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.24 }}
      className="rounded-card border border-border bg-surface p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h3 className="font-display text-sm font-semibold text-text">Status distribution</h3>

      {total === 0 ? (
        <p className="mt-8 text-center text-sm text-text-3">No objects yet.</p>
      ) : (
        <div className="mt-2 flex items-center gap-6">
          <div className="relative h-[160px] w-[160px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={52}
                  outerRadius={76}
                  paddingAngle={2}
                  strokeWidth={0}
                  animationDuration={600}
                >
                  {data.map((entry) => (
                    <Cell key={entry.status} fill={resolveStatusColor(entry.status, statuses)} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-2)",
                    borderRadius: 10,
                    fontSize: 12,
                    color: "var(--text)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl font-semibold">{total}</span>
              <span className="text-xs text-text-3">objects</span>
            </div>
          </div>

          <ul className="flex-1 space-y-2">
            {data.map((entry) => (
              <li key={entry.status} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-text-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: resolveStatusColor(entry.status, statuses) }}
                  />
                  {entry.status}
                </span>
                <span className="font-mono text-text">{entry.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

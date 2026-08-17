"use client";

import { motion } from "framer-motion";
import { Bar, BarChart, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface EffortTypeDatum {
  type: "Dev" | "Fiori" | "Functional";
  days: number;
}

// Fixed per-type colors (declaration order, not frequency-ranked) -- same
// reasoning as CRITICALITY_COLOR/PACKAGE_COLOR: a small, known-in-advance
// set gets a hardcoded color per key, not a ranked categorical assignment.
// All three are validated dark-mode categorical slots (see
// backlog-dashboard.tsx's header comment for the palette validation run).
const TYPE_COLOR: Record<EffortTypeDatum["type"], string> = {
  Dev: "#3987e5",
  Fiori: "#d95926",
  Functional: "#199e70",
};

export function BacklogEffortTypeBar({ data, caption, delay }: { data: EffortTypeDatum[]; caption?: string; delay: number }) {
  const total = data.reduce((sum, d) => sum + d.days, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-card border border-border bg-surface p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h3 className="font-display text-sm font-semibold text-text">Effort days by type</h3>
      {caption && <p className="mt-0.5 text-xs text-text-3">{caption}</p>}

      {total === 0 ? (
        <p className="mt-8 text-center text-sm text-text-3">Nothing to show yet.</p>
      ) : (
        <div className="mt-4 h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} stroke="var(--text-3)" fontSize={12} />
              <YAxis type="category" dataKey="type" width={72} stroke="var(--text-3)" fontSize={12} tickLine={false} />
              <Tooltip cursor={{ fill: "var(--surface-2)" }} contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border-2)", borderRadius: 10, fontSize: 12, color: "var(--text)" }} />
              <Bar dataKey="days" radius={[0, 6, 6, 0]} animationDuration={600}>
                {data.map((entry) => (
                  <Cell key={entry.type} fill={TYPE_COLOR[entry.type]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}

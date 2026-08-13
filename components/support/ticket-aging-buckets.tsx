"use client";

import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SupportDashboardData } from "@/lib/data/support";

export function TicketAgingBuckets({ data }: { data: SupportDashboardData["agingBuckets"] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.36 }}
      className="rounded-card border border-border bg-surface p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h3 className="font-display text-sm font-semibold text-text">Open ticket aging</h3>

      {total === 0 ? (
        <p className="mt-8 text-center text-sm text-text-3">No open tickets.</p>
      ) : (
        <div className="mt-4 h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="bucket" stroke="var(--text-3)" fontSize={12} tickLine={false} />
              <YAxis allowDecimals={false} stroke="var(--text-3)" fontSize={12} width={28} />
              <Tooltip cursor={{ fill: "var(--surface-2)" }} contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border-2)", borderRadius: 10, fontSize: 12, color: "var(--text)" }} />
              <Bar dataKey="count" fill="var(--brass)" radius={[6, 6, 0, 0]} animationDuration={600} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}

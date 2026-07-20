"use client";

import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardData } from "@/lib/data/dashboard";

export function ModuleBar({ data }: { data: DashboardData["byModule"] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="rounded-card border border-border bg-surface p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h3 className="font-display text-sm font-semibold text-text">Objects by module</h3>

      {data.length === 0 ? (
        <p className="mt-8 text-center text-sm text-text-3">No objects yet.</p>
      ) : (
        <div className="mt-4 h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} stroke="var(--text-3)" fontSize={12} />
              <YAxis
                type="category"
                dataKey="module"
                width={90}
                stroke="var(--text-3)"
                fontSize={12}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                contentStyle={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-2)",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "var(--text)",
                }}
              />
              <Bar dataKey="count" fill="var(--brass)" radius={[0, 6, 6, 0]} animationDuration={600} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}

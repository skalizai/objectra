"use client";

import { motion } from "framer-motion";
import type { DashboardData } from "@/lib/data/dashboard";

export function WaveProgress({ data }: { data: DashboardData["waveProgress"] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.36 }}
      className="rounded-card border border-border bg-surface p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h3 className="font-display text-sm font-semibold text-text">Wave progress</h3>

      {data.length === 0 ? (
        <p className="mt-8 text-center text-sm text-text-3">No objects yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {data.map((wave, i) => {
            const pct = wave.total === 0 ? 0 : Math.round((wave.live / wave.total) * 100);
            return (
              <li key={wave.wave}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-text-2">{wave.wave}</span>
                  <span className="font-mono text-text-3">
                    {wave.live}/{wave.total} live
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: 0.1 * i, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: "var(--status-live)" }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}

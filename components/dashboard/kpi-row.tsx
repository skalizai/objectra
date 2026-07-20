"use client";

import { motion } from "framer-motion";
import {
  IconBox,
  IconCircleCheck,
  IconProgress,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import type { DashboardData } from "@/lib/data/dashboard";

const TILES = (kpis: DashboardData["kpis"]) => [
  { label: "Total objects", value: kpis.total, icon: IconBox, colorVar: "var(--text-2)" },
  { label: "Live", value: kpis.live, icon: IconCircleCheck, colorVar: "var(--status-live)" },
  { label: "In flight", value: kpis.inFlight, icon: IconProgress, colorVar: "var(--status-in-progress)" },
  { label: "At risk", value: kpis.atRisk, icon: IconAlertTriangle, colorVar: "var(--status-overdue)" },
];

export function KpiRow({ kpis }: { kpis: DashboardData["kpis"] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {TILES(kpis).map((tile, i) => (
        <motion.div
          key={tile.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.06 }}
          whileHover={{ y: -2 }}
          className="rounded-card border border-border bg-surface p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-2">{tile.label}</span>
            <tile.icon size={18} style={{ color: tile.colorVar }} stroke={1.75} />
          </div>
          <div className="mt-3 font-display text-3xl font-semibold">
            <AnimatedCounter value={tile.value} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

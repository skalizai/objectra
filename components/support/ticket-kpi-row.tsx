"use client";

import { motion } from "framer-motion";
import { IconTicket, IconRoute, IconAlertTriangle, IconCircleCheck } from "@tabler/icons-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import type { SupportDashboardData } from "@/lib/data/support";

export function TicketKpiRow({ kpis }: { kpis: SupportDashboardData["kpis"] }) {
  const tiles = [
    { label: "Open", value: kpis.open, icon: IconTicket, colorVar: "var(--text-2)" },
    { label: "Unrouted", value: kpis.unrouted, icon: IconRoute, colorVar: "var(--status-overdue)" },
    { label: "Breaching SLA", value: kpis.breachingSla, icon: IconAlertTriangle, colorVar: "var(--status-overdue)" },
    { label: "Resolved this week", value: kpis.resolvedThisWeek, icon: IconCircleCheck, colorVar: "var(--status-live)" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map((tile, i) => (
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

"use client";

import { motion } from "framer-motion";
import { differenceInCalendarDays } from "date-fns";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { DEVELOPMENT_STATUS } from "@/lib/object-meta";
import type { ObjectRow } from "@/lib/types/database";

export function DeadlineTiles({ objects }: { objects: Pick<ObjectRow, "status" | "due_date">[] }) {
  let overdue = 0;
  let dueThisWeek = 0;
  let dueLater = 0;

  // These due dates only count while an object is actively in
  // Development in Progress — see lib/object-meta.ts.
  for (const obj of objects) {
    if (obj.status !== DEVELOPMENT_STATUS || !obj.due_date) continue;
    const days = differenceInCalendarDays(new Date(obj.due_date), new Date());
    if (days < 0) overdue += 1;
    else if (days <= 7) dueThisWeek += 1;
    else dueLater += 1;
  }

  const tiles = [
    { label: "Overdue", value: overdue, colorVar: "var(--status-overdue)" },
    { label: "Due this week", value: dueThisWeek, colorVar: "var(--status-in-progress)" },
    { label: "Due later", value: dueLater, colorVar: "var(--text-2)" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {tiles.map((tile, i) => (
        <motion.div
          key={tile.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.05 }}
          className="rounded-card border border-border bg-surface p-4"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="font-display text-2xl font-semibold" style={{ color: tile.colorVar }}>
            <AnimatedCounter value={tile.value} />
          </div>
          <div className="mt-1 text-xs text-text-3">{tile.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

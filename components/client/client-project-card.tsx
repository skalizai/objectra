"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { WricefGlyph } from "@/components/ui/wricef-glyph";
import { StatusPill } from "@/components/ui/status-pill";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import type { ClientProjectStatus } from "@/lib/data/client-view";

export function ClientProjectCard({ status, index }: { status: ClientProjectStatus; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="rounded-card border border-border bg-surface p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold">{status.project.name}</h2>
          <p className="mt-1 text-sm text-text-2">
            {status.live} of {status.total} objects live
          </p>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl font-semibold" style={{ color: "var(--status-live)" }}>
            <AnimatedCounter value={status.percentComplete} suffix="%" />
          </div>
          <div className="text-xs text-text-3">complete</div>
        </div>
      </div>

      {status.waves.length > 0 && (
        <div className="mt-5 space-y-3 border-t border-border pt-4">
          <h3 className="text-xs font-medium text-text-3">Milestones</h3>
          {status.waves.map((wave, i) => {
            const pct = wave.total === 0 ? 0 : Math.round((wave.live / wave.total) * 100);
            return (
              <div key={wave.wave}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-text-2">{wave.wave}</span>
                  <span className="font-mono text-xs text-text-3">{wave.live}/{wave.total}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                    className="h-full rounded-full"
                    style={{ background: "var(--status-live)" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <h3 className="mb-2 text-xs font-medium text-text-3">Objects</h3>
        <ul className="divide-y divide-border">
          {status.objects.slice(0, 12).map((obj) => (
            <li key={obj.id} className="flex items-center gap-3 py-2">
              <WricefGlyph type={obj.object_type} size={20} />
              <span className="min-w-0 flex-1 truncate text-sm text-text">{obj.title}</span>
              <span className="hidden shrink-0 font-mono text-xs text-text-3 sm:inline">
                {obj.due_date ? format(new Date(obj.due_date), "dd MMM yyyy") : "—"}
              </span>
              <StatusPill status={obj.status} dueDate={obj.due_date} className="shrink-0" />
            </li>
          ))}
        </ul>
        {status.objects.length > 12 && (
          <p className="mt-2 text-xs text-text-3">+{status.objects.length - 12} more</p>
        )}
      </div>
    </motion.div>
  );
}

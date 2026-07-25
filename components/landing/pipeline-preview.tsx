"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconArrowRight } from "@tabler/icons-react";
import { WricefGlyph } from "@/components/ui/wricef-glyph";
import type { ObjectType } from "@/lib/types/database";

interface StageItem {
  id: string;
  type: ObjectType;
  title: string;
}

const STAGES: { label: string; color: string; items: StageItem[] }[] = [
  {
    label: "Awaiting FDS",
    color: "#7A8492",
    items: [
      { id: "RP-0091", type: "Report", title: "AP ageing report" },
      { id: "EN-0204", type: "Enhancement", title: "Tax code validation" },
    ],
  },
  {
    label: "Development in Progress",
    color: "#E0A340",
    items: [{ id: "WF-0142", type: "Workflow", title: "Vendor onboarding approval" }],
  },
  {
    label: "UAT in Progress",
    color: "#4C8DF6",
    items: [{ id: "IF-0033", type: "Interface", title: "SAP ↔ Salesforce order sync" }],
  },
  {
    label: "Live",
    color: "#35C08A",
    items: [
      { id: "CV-0018", type: "Conversion", title: "Customer master upload" },
      { id: "FM-0077", type: "Form", title: "Goods receipt note" },
    ],
  },
];

const TRAVELER: StageItem = { id: "TR-0056", type: "Enhancement", title: "Custom pricing condition" };
const HOP_MS = 2200;

export function PipelinePreview() {
  const [laneIndex, setLaneIndex] = useState(0);
  const arrived = STAGES[laneIndex];
  const isLive = laneIndex === STAGES.length - 1;

  useEffect(() => {
    const interval = setInterval(() => {
      setLaneIndex((i) => (i + 1) % STAGES.length);
    }, HOP_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden border-t border-border px-6 py-24">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[420px] w-[720px] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in srgb, var(--brass) 12%, transparent), transparent)",
        }}
        animate={{ opacity: [0.4, 0.75, 0.4], scale: [0.92, 1.04, 0.92] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="mx-auto max-w-[1220px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="flex max-w-2xl flex-wrap items-end justify-between gap-4"
        >
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Watch an object move, end to end.
            </h2>
            <p className="mt-4 max-w-xl text-text-2">
              The same pipeline board your team works from every day — a status change here updates the
              client view, the audit trail, and the next status email automatically.
            </p>
          </div>

          <div className="hidden shrink-0 items-center gap-2 rounded-full border border-border-2 px-3 py-1 text-xs text-text-2 sm:flex">
            <AnimatePresence mode="wait">
              <motion.span
                key={laneIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-1.5"
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: arrived.color }} />
                {TRAVELER.id} → {arrived.label}
              </motion.span>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Flow rail — a travelling pulse of light that sweeps left to right
            above the lanes, echoing the object's own hop-by-hop motion below. */}
        <div className="relative mx-1 mt-12 hidden h-px bg-border-2 lg:block">
          <motion.div
            className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
            style={{ background: "var(--brass)", boxShadow: "0 0 10px 3px color-mix(in srgb, var(--brass) 55%, transparent)" }}
            animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
            transition={{ duration: HOP_MS * STAGES.length / 1000, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {STAGES.map((stage, i) => {
            const showTraveler = laneIndex === i;
            const count = stage.items.length + (showTraveler ? 1 : 0);
            return (
              <div key={stage.label} className="relative lg:px-2.5">
                {i > 0 && (
                  <IconArrowRight
                    size={16}
                    className="absolute -left-[9px] top-1/2 hidden -translate-y-1/2 text-text-3 lg:block"
                  />
                )}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  animate={
                    showTraveler
                      ? { borderColor: stage.color, boxShadow: `0 0 0 1px ${stage.color}, var(--shadow-card)` }
                      : { borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }
                  }
                  className="h-full rounded-card border bg-surface p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-medium text-text-2">
                      <motion.span
                        className="h-2 w-2 rounded-full"
                        style={{ background: stage.color }}
                        animate={showTraveler ? { scale: [1, 1.6, 1] } : { scale: 1 }}
                        transition={{ duration: 1.1, repeat: showTraveler ? Infinity : 0, ease: "easeInOut" }}
                      />
                      {stage.label}
                    </span>
                    <motion.span
                      key={count}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-mono text-xs text-text-3"
                    >
                      {count}
                    </motion.span>
                  </div>

                  <div className="space-y-2">
                    {showTraveler && (
                      <motion.div
                        layoutId="traveling-object"
                        transition={{ type: "spring", stiffness: 260, damping: 22 }}
                        className="relative flex items-center gap-2 rounded-control border px-2.5 py-2"
                        style={{
                          borderColor: stage.color,
                          background: `color-mix(in srgb, ${stage.color} 14%, var(--surface-2))`,
                        }}
                      >
                        {isLive && (
                          <motion.span
                            key={`burst-${laneIndex}`}
                            aria-hidden
                            className="pointer-events-none absolute inset-0 rounded-control"
                            style={{ border: `1.5px solid ${stage.color}` }}
                            initial={{ opacity: 0.7, scale: 1 }}
                            animate={{ opacity: 0, scale: 1.4 }}
                            transition={{ duration: 0.9, ease: "easeOut" }}
                          />
                        )}
                        <WricefGlyph type={TRAVELER.type} size={18} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs text-text">{TRAVELER.title}</div>
                          <div className="font-mono text-[10px] text-text-3">{TRAVELER.id}</div>
                        </div>
                      </motion.div>
                    )}
                    {stage.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-control border border-border bg-surface-2 px-2.5 py-2"
                      >
                        <WricefGlyph type={item.type} size={18} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs text-text-2">{item.title}</div>
                          <div className="font-mono text-[10px] text-text-3">{item.id}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

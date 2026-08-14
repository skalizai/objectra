"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconArrowRight, IconCircleCheck } from "@tabler/icons-react";
import { TicketGlyph } from "@/components/support/ticket-glyph";
import { CriticalityPill } from "@/components/support/criticality-pill";

interface StageItem {
  ticketNo: string;
  module: string;
  subject: string;
}

const STAGES: { label: string; color: string; items: StageItem[] }[] = [
  {
    label: "New",
    color: "#7A8492",
    items: [{ ticketNo: "FI-INC-0204", module: "FI", subject: "Cost center report shows stale data" }],
  },
  {
    label: "Assigned",
    color: "#C79A4B",
    items: [{ ticketNo: "SD-INC-0091", module: "SD", subject: "Vendor master sync delayed" }],
  },
  {
    label: "In Progress",
    color: "#E0A340",
    items: [{ ticketNo: "OTC-INC-0018", module: "OTC", subject: "Invoice PDF not generating" }],
  },
  {
    label: "Resolved",
    color: "#35C08A",
    items: [
      { ticketNo: "PP-INC-0077", module: "PP", subject: "Batch job stuck in queue" },
      { ticketNo: "MM-INC-0009", module: "MM", subject: "Duplicate goods receipt" },
    ],
  },
];

const TRAVELER: StageItem = { ticketNo: "MM-INC-0042", module: "MM", subject: "Order sync failing for EU orders" };
const HOP_MS = 2200;
const SLA_TOTAL_SECONDS = 4 * 3600; // P1 · Critical default resolve target (4h)

function formatCountdown(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function TicketFlowPreview() {
  const [laneIndex, setLaneIndex] = useState(0);
  const arrived = STAGES[laneIndex];
  const isResolved = laneIndex === STAGES.length - 1;
  const remainingSeconds = SLA_TOTAL_SECONDS * (1 - laneIndex / (STAGES.length - 1));

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
          background: "radial-gradient(closest-side, color-mix(in srgb, #F0574B 10%, transparent), transparent)",
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
              Hypercare tickets, worked and watched live.
            </h2>
            <p className="mt-4 max-w-xl text-text-2">
              Once a project goes live, incidents auto-route to the right consultant by module, count down against
              their SLA, and the moment status changes, the raiser hears about it automatically.
            </p>
          </div>

          <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
            <div className="flex items-center gap-2 rounded-full border border-border-2 px-3 py-1 text-xs text-text-2">
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
                  {TRAVELER.ticketNo} → {arrived.label}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px]" style={{ color: isResolved ? "#35C08A" : "#8a8271" }}>
              {isResolved ? (
                <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1">
                  <IconCircleCheck size={13} /> Resolved within SLA
                </motion.span>
              ) : (
                <>SLA due in {formatCountdown(remainingSeconds)}</>
              )}
            </div>
          </div>
        </motion.div>

        <div className="relative mx-1 mt-12 hidden h-px bg-border-2 lg:block">
          <motion.div
            className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
            style={{ background: "#F0574B", boxShadow: "0 0 10px 3px color-mix(in srgb, #F0574B 55%, transparent)" }}
            animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
            transition={{ duration: (HOP_MS * STAGES.length) / 1000, repeat: Infinity, ease: "linear" }}
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
                        layoutId="traveling-ticket"
                        transition={{ type: "spring", stiffness: 260, damping: 22 }}
                        className="relative flex items-center gap-2 rounded-control border px-2.5 py-2"
                        style={{
                          borderColor: stage.color,
                          background: `color-mix(in srgb, ${stage.color} 14%, var(--surface-2))`,
                        }}
                      >
                        {isResolved && (
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
                        <TicketGlyph module={TRAVELER.module} size={18} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs text-text">{TRAVELER.subject}</div>
                          <div className="font-mono text-[10px] text-text-3">{TRAVELER.ticketNo}</div>
                        </div>
                        <CriticalityPill criticality="P1_critical" className="shrink-0 px-1.5 py-0 text-[9px]" />
                      </motion.div>
                    )}
                    {stage.items.map((item) => (
                      <div
                        key={item.ticketNo}
                        className="flex items-center gap-2 rounded-control border border-border bg-surface-2 px-2.5 py-2"
                      >
                        <TicketGlyph module={item.module} size={18} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs text-text-2">{item.subject}</div>
                          <div className="font-mono text-[10px] text-text-3">{item.ticketNo}</div>
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

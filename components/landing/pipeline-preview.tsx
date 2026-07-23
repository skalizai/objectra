"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { WricefGlyph } from "@/components/ui/wricef-glyph";
import type { ObjectType } from "@/lib/types/database";

interface StageItem {
  id: string;
  type: ObjectType;
  title: string;
}

const STAGES: { label: string; color: string; items: StageItem[] }[] = [
  {
    label: "Process/Pending",
    color: "#7A8492",
    items: [
      { id: "RP-0091", type: "Report", title: "AP ageing report" },
      { id: "EN-0204", type: "Enhancement", title: "Tax code validation" },
    ],
  },
  {
    label: "In Progress",
    color: "#E0A340",
    items: [{ id: "WF-0142", type: "Workflow", title: "Vendor onboarding approval" }],
  },
  {
    label: "Testing in QA",
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

export function PipelinePreview() {
  const [laneIndex, setLaneIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLaneIndex((i) => (i + 1) % STAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="border-t border-border px-6 py-24">
      <div className="mx-auto max-w-[1220px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="max-w-xl"
        >
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Watch an object move, end to end.
          </h2>
          <p className="mt-4 text-text-2">
            The same pipeline board your team works from every day — a status change here updates the
            client view, the audit trail, and the next status email automatically.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((stage, i) => {
            const showTraveler = laneIndex === i;
            const count = stage.items.length + (showTraveler ? 1 : 0);
            return (
              <motion.div
                key={stage.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="rounded-card border border-border bg-surface p-4"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-medium text-text-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: stage.color }} />
                    {stage.label}
                  </span>
                  <span className="font-mono text-xs text-text-3">{count}</span>
                </div>

                <div className="space-y-2">
                  {showTraveler && (
                    <motion.div
                      layoutId="traveling-object"
                      transition={{ type: "spring", stiffness: 260, damping: 24 }}
                      className="flex items-center gap-2 rounded-control border px-2.5 py-2"
                      style={{
                        borderColor: stage.color,
                        background: `color-mix(in srgb, ${stage.color} 14%, var(--surface-2))`,
                      }}
                    >
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
            );
          })}
        </div>
      </div>
    </section>
  );
}

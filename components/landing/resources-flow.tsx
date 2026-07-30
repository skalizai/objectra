"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconArrowRight, IconMailFast, IconUserPlus, IconLink } from "@tabler/icons-react";
import { WricefGlyph } from "@/components/ui/wricef-glyph";
import type { ObjectType } from "@/lib/types/database";

const HOP_MS = 2600;

const STEPS = [
  {
    icon: IconUserPlus,
    label: "Add a resource",
    description: "Create a profile — role, skills, location, and a planned allocation %.",
  },
  {
    icon: IconLink,
    label: "Assign to objects",
    description:
      "Link them to WRICEF objects across one or more projects, at whatever % they're booked.",
  },
  {
    icon: IconMailFast,
    label: "Objectra keeps them posted",
    description:
      "Invite, deadline alerts, and the weekly digest go out on their own — every send logged.",
  },
];

const RESOURCE = { name: "Maya Chen", role: "Functional Consultant", initials: "MC" };

const ASSIGNED_OBJECTS: { id: string; type: ObjectType; title: string; pct: string }[] = [
  { id: "WF-0142", type: "Workflow", title: "Vendor onboarding approval", pct: "60%" },
  { id: "EN-0204", type: "Enhancement", title: "Tax code validation", pct: "30%" },
];

const EMAIL_EVENTS = [
  "Invite sent — accept & set password",
  "Deadline alert — WF-0142 due in 3 days",
  "Weekly digest sent to PM + client",
];

export function ResourcesFlow() {
  const [step, setStep] = useState(0);
  const [emailIndex, setEmailIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setStep((s) => (s + 1) % STEPS.length), HOP_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (step !== 2) return;
    const interval = setInterval(() => setEmailIndex((i) => (i + 1) % EMAIL_EVENTS.length), 1300);
    return () => clearInterval(interval);
  }, [step]);

  return (
    <section id="resources" className="relative overflow-hidden border-t border-border px-6 py-24">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-10 -z-10 h-[380px] w-[680px] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in srgb, var(--brass) 12%, transparent), transparent)",
        }}
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.92, 1.03, 0.92] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="mx-auto max-w-[1220px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="max-w-xl"
        >
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            From resource to inbox, in three steps.
          </h2>
          <p className="mt-4 text-text-2">
            Add someone once — Objectra tracks where they&apos;re allocated and keeps them, their PM, and
            their client posted without anyone sending a status email by hand.
          </p>
        </motion.div>

        <div className="relative mx-1 mt-12 hidden h-px bg-border-2 lg:block">
          <motion.div
            className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
            style={{
              background: "var(--brass)",
              boxShadow: "0 0 10px 3px color-mix(in srgb, var(--brass) 55%, transparent)",
            }}
            animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
            transition={{ duration: (HOP_MS * STEPS.length) / 1000, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => {
            const active = step === i;
            return (
              <div key={s.label} className="relative">
                {i > 0 && (
                  <IconArrowRight
                    size={16}
                    className="absolute -left-[9px] top-9 hidden -translate-y-1/2 text-text-3 lg:block"
                  />
                )}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  animate={
                    active
                      ? { borderColor: "var(--brass)", boxShadow: "0 0 0 1px var(--brass), var(--shadow-card)" }
                      : { borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }
                  }
                  className="flex h-full min-h-[224px] flex-col rounded-card border bg-surface p-5"
                >
                  <div className="mb-4 flex items-center gap-2.5">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control"
                      style={{ background: "var(--surface-2)", color: "var(--brass)" }}
                    >
                      <s.icon size={18} stroke={1.75} />
                    </div>
                    <h3 className="font-display text-base font-semibold">{s.label}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-text-2">{s.description}</p>

                  <div className="mt-auto pt-4">
                    {i === 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="flex items-center gap-2.5 rounded-control border border-border bg-surface-2 px-2.5 py-2"
                      >
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-medium text-on-brass"
                          style={{ background: "var(--brass)" }}
                        >
                          {RESOURCE.initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs text-text">{RESOURCE.name}</div>
                          <div className="truncate text-[10px] text-text-3">{RESOURCE.role}</div>
                        </div>
                        <span className="shrink-0 rounded-full border border-border-2 px-1.5 py-0.5 font-mono text-[10px] text-text-3">
                          50%
                        </span>
                      </motion.div>
                    )}

                    {i === 1 && (
                      <div className="space-y-1.5">
                        {ASSIGNED_OBJECTS.map((obj, oi) => (
                          <motion.div
                            key={obj.id}
                            initial={{ opacity: 0, x: 10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.35, delay: 0.15 + oi * 0.12 }}
                            className="flex items-center gap-2 rounded-control border border-border bg-surface-2 px-2.5 py-1.5"
                          >
                            <WricefGlyph type={obj.type} size={16} />
                            <span className="min-w-0 flex-1 truncate text-xs text-text-2">{obj.title}</span>
                            <span className="font-mono text-[10px] text-text-3">{obj.pct}</span>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {i === 2 && (
                      <div className="rounded-control border border-border bg-surface-2 px-2.5 py-2.5">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={emailIndex}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.25 }}
                            className="flex items-start gap-2"
                          >
                            <IconMailFast
                              size={14}
                              className="mt-0.5 shrink-0"
                              style={{ color: "var(--brass)" }}
                            />
                            <span className="text-xs text-text-2">{EMAIL_EVENTS[emailIndex]}</span>
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    )}
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

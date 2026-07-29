"use client";

import { motion } from "framer-motion";
import { IconCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

const INCLUDED = [
  "Unlimited projects & WRICEF objects",
  "Resource allocation % & over-capacity alerts",
  "Automated deadline alerts & weekly digest",
  "Row-level security — members see only their work",
  "Dedicated client-facing project view",
  ".xlsx import for an existing tracker",
  "Full audit trail on every status change",
  "Multi-tenant — not hard-coded to one org",
];

export function CtaBand() {
  return (
    <section id="pricing" className="border-t border-border px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-[1220px] text-center"
      >
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Simple, transparent pricing.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-text-2">
          One flat price to invite your organization onto Objectra Labs — every feature included,
          nothing gated behind tiers.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mx-auto mt-12 flex max-w-[820px] flex-col gap-8 rounded-card border border-border bg-surface p-8 sm:p-10"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-5xl font-semibold text-text">$500</span>
              <span className="text-text-3">USD / invite</span>
            </div>
            <p className="mt-2 max-w-xs text-sm text-text-2">
              Covers onboarding your org_admin — every project, resource, and client login that
              follows is included.
            </p>
          </div>
          <div className="shrink-0">
            <Button size="md" disabled className="w-full sm:w-auto">
              Request an invite
            </Button>
            <p className="mt-2 text-xs text-text-3">Payment gateway coming soon.</p>
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <ul className="grid gap-3 sm:grid-cols-2">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-text-2">
                <IconCheck size={16} className="mt-0.5 shrink-0" style={{ color: "var(--brass)" }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </section>
  );
}

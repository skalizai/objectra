"use client";

import { motion } from "framer-motion";
import {
  IconBrandNextjs,
  IconBrandTypescript,
  IconBrandTailwind,
  IconBrandFramerMotion,
  IconChartLine,
  IconBrandSupabase,
  IconMail,
  IconBrandVercel,
  IconFileSpreadsheet,
} from "@tabler/icons-react";

const STACK = [
  {
    icon: IconBrandNextjs,
    title: "Next.js (App Router)",
    description: "Server components and routing for the whole console and marketing site.",
  },
  {
    icon: IconBrandTypescript,
    title: "TypeScript",
    description: "Typed end to end — server actions, data queries, and every component.",
  },
  {
    icon: IconBrandTailwind,
    title: "Tailwind CSS v4",
    description: "Utility-first styling, driving the design tokens across light and dark.",
  },
  {
    icon: IconBrandFramerMotion,
    title: "Framer Motion",
    description: "Every transition and micro-interaction you see in this UI.",
  },
  {
    icon: IconChartLine,
    title: "Recharts",
    description: "Trend lines and completion charts across the dashboard and previews.",
  },
  {
    icon: IconBrandSupabase,
    title: "Supabase",
    description: "Postgres, Auth, Storage, and row-level security enforced at the database.",
  },
  {
    icon: IconMail,
    title: "Resend + React Email",
    description: "Deadline alerts and the weekly digest, branded and logged for every send.",
  },
  {
    icon: IconBrandVercel,
    title: "Vercel Cron",
    description: "Schedules the daily deadline-scan and weekly-digest jobs.",
  },
  {
    icon: IconFileSpreadsheet,
    title: "SheetJS",
    description: ".xlsx import for teams migrating an existing WRICEF tracker.",
  },
];

export function ArchitectureSection() {
  return (
    <section id="architecture" className="border-t border-border px-6 py-24">
      <div className="mx-auto max-w-[1220px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="max-w-xl"
        >
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            What it&apos;s built on.
          </h2>
          <p className="mt-4 text-text-2">
            No black box — here&apos;s the stack running underneath every project you create.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STACK.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              whileHover={{ y: -3, borderColor: "var(--brass)" }}
              className="flex items-start gap-3 rounded-card border border-border bg-surface p-4"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control"
                style={{ background: "var(--surface-2)", color: "var(--brass)" }}
              >
                <item.icon size={18} stroke={1.75} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-text">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-text-2">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

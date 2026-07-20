"use client";

import { motion } from "framer-motion";
import {
  IconBuildingSkyscraper,
  IconGauge,
  IconMailFast,
  IconEyeCheck,
} from "@tabler/icons-react";

const FEATURES = [
  {
    icon: IconBuildingSkyscraper,
    title: "Any project, any object",
    description:
      "Nothing is hard-coded to one client. Spin up a project, import or add WRICEF objects, and track them from kickoff to go-live.",
  },
  {
    icon: IconGauge,
    title: "Resource allocation %",
    description:
      "See who's assigned where and at what allocation, with a capacity view that flags anyone booked over 100% across active projects.",
  },
  {
    icon: IconMailFast,
    title: "Automated emails",
    description:
      "Deadline alerts and a weekly status digest go out on their own — grouped per recipient, branded, and logged for every send.",
  },
  {
    icon: IconEyeCheck,
    title: "See only what's yours",
    description:
      "Row-level security means a member's dashboard only ever shows objects assigned to them — enforced in the database, not the UI.",
  },
];

export function FeatureGrid() {
  return (
    <section id="platform" className="border-t border-border px-6 py-24">
      <div className="mx-auto max-w-[1220px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="max-w-xl"
        >
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for delivery organisations, not one client.
          </h2>
          <p className="mt-4 text-text-2">
            Objectra Labs is the shared system every project team, resource, and client stakeholder
            works from — scoped to exactly what each of them should see.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className="rounded-card border border-border bg-surface p-6"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-control"
                style={{ background: "var(--surface-2)", color: "var(--brass)" }}
              >
                <feature.icon size={20} stroke={1.75} />
              </div>
              <h3 className="font-display text-base font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-2">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

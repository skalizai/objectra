"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function CtaBand() {
  return (
    <section id="pricing" className="border-t border-border px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="mx-auto flex max-w-[1220px] flex-col items-start justify-between gap-8 rounded-card border border-border bg-surface p-10 sm:flex-row sm:items-center"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div>
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">
            Invite-only, by design.
          </h2>
          <p className="mt-2 max-w-lg text-text-2">
            Every org_admin, project manager, resource, and client login on Objectra Labs is
            provisioned by invite — no public sign-up, no unmanaged access to your projects.
          </p>
        </div>
        <Link href="/sign-in" className="shrink-0">
          <Button size="md">Sign in to your workspace</Button>
        </Link>
      </motion.div>
    </section>
  );
}

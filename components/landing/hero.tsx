"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { IconArrowRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { HeroPreview } from "@/components/landing/hero-preview";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.08 * i },
  }),
};

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-20 pb-28">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]"
        style={{
          background:
            "radial-gradient(700px 320px at 50% -10%, color-mix(in srgb, var(--brass) 14%, transparent), transparent)",
        }}
      />

      <div className="mx-auto grid max-w-[1220px] gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <motion.div
            custom={0}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border-2 px-3 py-1 text-xs text-text-2"
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--brass)" }} />
            For delivery organisations
          </motion.div>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Every development object.
            <br />
            <span style={{ color: "var(--brass)" }}>Every client project.</span>
            <br />
            One system of record.
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mt-6 max-w-xl text-lg text-text-2"
          >
            Objectra Labs tracks WRICEF objects, resource allocation, and delivery status across every
            client engagement — and emails the right people before anything slips.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Link href="/sign-in">
              <Button size="md" className="gap-2">
                Get started <IconArrowRight size={16} />
              </Button>
            </Link>
            <a href="#platform">
              <Button size="md" variant="outline">
                See the platform
              </Button>
            </a>
          </motion.div>

          <motion.div
            custom={4}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mt-14 grid max-w-lg grid-cols-3 gap-8 border-t border-border pt-8"
          >
            <div>
              <div className="font-display text-3xl font-semibold">
                <AnimatedCounter value={4280} suffix="+" />
              </div>
              <div className="mt-1 text-sm text-text-3">objects tracked</div>
            </div>
            <div>
              <div className="font-display text-3xl font-semibold">
                <AnimatedCounter value={36} />
              </div>
              <div className="mt-1 text-sm text-text-3">active projects</div>
            </div>
            <div>
              <div className="font-display text-3xl font-semibold">
                <AnimatedCounter value={98} suffix="%" />
              </div>
              <div className="mt-1 text-sm text-text-3">deadline visibility</div>
            </div>
          </motion.div>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

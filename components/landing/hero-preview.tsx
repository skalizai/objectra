"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import {
  IconBell,
  IconFolders,
  IconLayoutDashboard,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import { StatusPill } from "@/components/ui/status-pill";
import { WricefGlyph } from "@/components/ui/wricef-glyph";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import type { ObjectType } from "@/lib/types/database";

const PREVIEW_ROWS: Array<{ id: string; type: ObjectType; title: string; status: string }> = [
  { id: "WF-0142", type: "Workflow", title: "Vendor onboarding approval", status: "In Progress" },
  { id: "RP-0087", type: "Report", title: "Regional sales variance", status: "Testing in QA" },
  { id: "IF-0033", type: "Interface", title: "SAP ↔ Salesforce order sync", status: "Live" },
];

const TREND = [{ v: 32 }, { v: 40 }, { v: 38 }, { v: 52 }, { v: 48 }, { v: 61 }, { v: 68 }];

const NOTIFICATIONS = [
  "IF-0033 moved to Live by Priya Sharma",
  "Deadline alert sent — WF-0142 due in 3 days",
  "Weekly digest sent to 3 PMs and 2 clients",
];

const SIDEBAR_ICONS = [IconLayoutDashboard, IconFolders, IconUsers, IconSettings];

const RING_RADIUS = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const COMPLETE_PCT = 68;

function CompletionRing() {
  return (
    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
      <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
        <circle cx="22" cy="22" r={RING_RADIUS} fill="none" stroke="var(--border-2)" strokeWidth="4" />
        <motion.circle
          cx="22"
          cy="22"
          r={RING_RADIUS}
          fill="none"
          stroke="var(--status-live)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
          animate={{ strokeDashoffset: RING_CIRCUMFERENCE * (1 - COMPLETE_PCT / 100) }}
          transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute font-display text-[10px] font-semibold">
        <AnimatedCounter value={COMPLETE_PCT} suffix="%" />
      </span>
    </div>
  );
}

export function HeroPreview() {
  const [toastIndex, setToastIndex] = useState(0);
  const [showToast, setShowToast] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowToast(false);
      window.setTimeout(() => {
        setToastIndex((i) => (i + 1) % NOTIFICATIONS.length);
        setShowToast(true);
      }, 300);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: [0, -6, 0] }}
      transition={{
        opacity: { duration: 0.6, delay: 0.2 },
        y: { duration: 5, delay: 1, repeat: Infinity, ease: "easeInOut" },
      }}
      className="relative"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-10 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in srgb, var(--brass) 20%, transparent), transparent)",
        }}
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <div
        className="relative flex overflow-hidden rounded-card border border-border bg-surface"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="hidden w-14 shrink-0 flex-col items-center gap-4 border-r border-border bg-surface-2/60 py-5 sm:flex">
          <div className="h-6 w-6 rounded-md" style={{ background: "var(--brass)" }} />
          <div className="mt-2 flex flex-col gap-3">
            {SIDEBAR_ICONS.map((Icon, i) => (
              <div
                key={i}
                className="flex h-8 w-8 items-center justify-center rounded-control"
                style={
                  i === 1
                    ? { background: "color-mix(in srgb, var(--brass) 18%, transparent)" }
                    : undefined
                }
              >
                <Icon size={16} style={{ color: i === 1 ? "var(--brass)" : "var(--text-3)" }} />
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-text">Acme Corp</div>
              <div className="text-xs text-text-3">Wave 2 · S/4HANA Rollout</div>
            </div>
            <span className="relative flex h-2.5 w-2.5">
              <motion.span
                className="absolute inline-flex h-full w-full rounded-full"
                style={{ background: "var(--status-live)" }}
                animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              />
              <span
                className="relative inline-flex h-2.5 w-2.5 rounded-full"
                style={{ background: "var(--status-live)" }}
              />
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="flex items-center gap-2 rounded-control border border-border bg-surface-2 px-2 py-1.5">
              <CompletionRing />
              <div className="text-[10px] leading-tight text-text-3">Complete</div>
            </div>
            <div className="flex flex-col justify-center rounded-control border border-border bg-surface-2 px-2.5 py-1.5">
              <div className="font-display text-lg font-semibold text-text">
                <AnimatedCounter value={12} />
              </div>
              <div className="text-[10px] leading-tight text-text-3">due this week</div>
            </div>
            <div className="flex flex-col justify-center rounded-control border border-border bg-surface-2 px-2.5 py-1.5">
              <div className="font-display text-lg font-semibold" style={{ color: "var(--status-overdue)" }}>
                <AnimatedCounter value={3} />
              </div>
              <div className="text-[10px] leading-tight text-text-3">at risk</div>
            </div>
          </div>

          <div className="mt-3 h-12 rounded-control border border-border bg-surface-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND} margin={{ top: 6, left: 0, right: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="heroTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brass)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--brass)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="var(--brass)"
                  strokeWidth={2}
                  fill="url(#heroTrend)"
                  animationDuration={1200}
                  isAnimationActive
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 space-y-1.5">
            {PREVIEW_ROWS.map((row, i) => (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                whileHover={{ x: 2 }}
                className="flex items-center gap-2.5 rounded-control border border-border bg-surface-2 px-2.5 py-2"
              >
                <WricefGlyph type={row.type} size={18} />
                <span className="min-w-0 flex-1 truncate text-xs text-text">{row.title}</span>
                <StatusPill status={row.status} className="shrink-0" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute -bottom-6 -right-3 z-20 w-[230px] sm:-right-7">
        <AnimatePresence mode="wait">
          {showToast && (
            <motion.div
              key={toastIndex}
              initial={{ opacity: 0, y: 12, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-2 rounded-control border border-border-2 bg-surface px-3 py-2.5 text-xs text-text-2"
              style={{ boxShadow: "0 12px 32px rgba(0,0,0,.35)" }}
            >
              <IconBell size={14} className="mt-0.5 shrink-0" style={{ color: "var(--brass)" }} />
              <span>{NOTIFICATIONS[toastIndex]}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

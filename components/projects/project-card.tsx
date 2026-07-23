"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { IconCalendar, IconUser } from "@tabler/icons-react";
import { format } from "date-fns";
import type { ProjectWithPm } from "@/lib/data/projects";

const STATUS_META: Record<ProjectWithPm["status"], { label: string; colorVar: string }> = {
  active: { label: "Active", colorVar: "var(--status-live)" },
  paused: { label: "Paused", colorVar: "var(--status-in-progress)" },
  closed: { label: "Closed", colorVar: "var(--text-3)" },
};

export function ProjectCard({ project, index }: { project: ProjectWithPm; index: number }) {
  const status = STATUS_META[project.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -3 }}
    >
      <Link
        // /projects/[id] now renders its own Overview content directly
        // (no server redirect), so linking straight here is safe — the
        // earlier router-internals crash was specifically caused by
        // landing on a route that itself issued a redirect().
        href={`/projects/${project.id}`}
        className="block rounded-card border border-border bg-surface p-5 transition-colors hover:border-border-2"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-display text-base font-semibold">{project.name}</div>
            <div className="mt-0.5 truncate text-sm text-text-2">{project.client_name}</div>
          </div>
          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
            style={{ borderColor: status.colorVar, color: status.colorVar, borderWidth: 1.5 }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.colorVar }} />
            {status.label}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-1.5 font-mono text-xs text-text-3">{project.code}</div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-xs text-text-3">
          <span className="flex items-center gap-1.5">
            <IconUser size={14} />
            {project.pm?.full_name ?? "Unassigned"}
          </span>
          <span className="flex items-center gap-1.5">
            <IconCalendar size={14} />
            {project.target_go_live ? format(new Date(project.target_go_live), "dd MMM yyyy") : "No date"}
          </span>
          <span>{project.object_count} objects</span>
        </div>
      </Link>
    </motion.div>
  );
}

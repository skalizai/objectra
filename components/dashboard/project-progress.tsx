"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { DashboardData } from "@/lib/data/dashboard";

export function ProjectProgress({
  data,
  statusAccents,
}: {
  data: DashboardData["projectProgress"];
  statusAccents: DashboardData["statusAccents"];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.36 }}
      className="rounded-card border border-border bg-surface p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <h3 className="font-display text-sm font-semibold text-text">Project progress</h3>

      {data.length === 0 ? (
        <p className="mt-8 text-center text-sm text-text-3">No objects yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {data.map((project, i) => {
            const pct = project.total === 0 ? 0 : Math.round((project.live / project.total) * 100);
            return (
              <li key={project.projectId}>
                <Link
                  href={`/projects/${project.projectId}`}
                  className="mb-1.5 flex items-center justify-between gap-2 text-sm hover:text-brass"
                >
                  <span className="min-w-0 truncate text-text-2">
                    {project.name}
                    <span className="ml-1.5 font-mono text-xs text-text-3">{project.code}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {project.atRisk > 0 && (
                      <span
                        className="flex items-center gap-1 text-xs"
                        style={{ color: "var(--status-overdue)" }}
                      >
                        <IconAlertTriangle size={12} />
                        {project.atRisk}
                      </span>
                    )}
                    <span className="font-mono text-xs text-text-3">
                      {project.live}/{project.total} live
                    </span>
                  </span>
                </Link>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: 0.1 * i, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: "var(--status-live)" }}
                  />
                </div>

                {(project.developmentInProgress.length > 0 ||
                  project.functionalTestingInQuality.length > 0) && (
                  <div className="mt-3 space-y-3">
                    <ResourceHoldingGroup
                      label="Development in Progress"
                      accent={statusAccents.developmentInProgress}
                      holdings={project.developmentInProgress}
                    />
                    <ResourceHoldingGroup
                      label="Functional testing quality"
                      accent={statusAccents.functionalTestingInQuality}
                      holdings={project.functionalTestingInQuality}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}

function ResourceHoldingGroup({
  label,
  accent,
  holdings,
}: {
  label: string;
  accent: string;
  holdings: DashboardData["projectProgress"][number]["developmentInProgress"];
}) {
  if (holdings.length === 0) return null;

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-3">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
        {label}
      </div>
      <ul className="space-y-1 pl-3">
        {holdings.map((h) => (
          <li key={h.objectId} className="flex items-center justify-between gap-3 text-xs">
            <span className="min-w-0 truncate text-text-2">
              {h.wricefId && <span className="mr-1.5 font-mono text-text-3">{h.wricefId}</span>}
              {h.title}
            </span>
            <span className="shrink-0 text-text-3">{h.resourceName}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

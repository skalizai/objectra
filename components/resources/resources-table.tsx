"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { IconAlertTriangle, IconCircleCheck } from "@tabler/icons-react";
import { InviteButton } from "@/components/resources/invite-button";
import { EditResourceButton } from "@/components/resources/edit-resource-button";
import { DeleteResourceButton } from "@/components/resources/delete-resource-button";
import type { ResourceWithAllocation } from "@/lib/data/resources";

const LOCATION_LABEL: Record<string, string> = { onsite: "Onsite", offshore: "Offshore" };

type TypeTab = "all" | "pmo" | "functional" | "technical";
const TYPE_TABS: { key: TypeTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pmo", label: "PMO Team" },
  { key: "functional", label: "Functional" },
  { key: "technical", label: "Technical" },
];

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export function ResourcesTable({
  resources,
  canInvite,
  projectOptions,
}: {
  resources: ResourceWithAllocation[];
  canInvite: boolean;
  projectOptions: { id: string; name: string }[];
}) {
  const [tab, setTab] = useState<TypeTab>("all");
  const [rows, setRows] = useState(resources);
  // `resources` is copied into local state so an optimistic delete can
  // remove a row immediately — but that means this must resync whenever
  // the parent re-renders with a genuinely new list (e.g. an edit saved
  // elsewhere). Adjusted during render (React's documented pattern for
  // this) rather than in an effect, which would cause an extra cascading
  // render.
  const [prevResources, setPrevResources] = useState(resources);
  if (resources !== prevResources) {
    setPrevResources(resources);
    setRows(resources);
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const counts = {
    all: rows.length,
    pmo: rows.filter((r) => r.consultant_type === "pmo").length,
    functional: rows.filter((r) => r.consultant_type === "functional").length,
    technical: rows.filter((r) => r.consultant_type === "technical").length,
  };
  const filteredRows = tab === "all" ? rows : rows.filter((r) => r.consultant_type === tab);

  return (
    <div>
      <div className="mb-3 flex gap-1 border-b border-border">
        {TYPE_TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                active ? "text-text" : "text-text-2 hover:text-text"
              }`}
            >
              {t.label}
              <span className="ml-1.5 font-mono text-xs text-text-3">{counts[t.key]}</span>
              {active && (
                <motion.span
                  layoutId="resources-type-tab-active"
                  className="absolute inset-x-3 -bottom-px h-0.5 rounded-full"
                  style={{ background: "var(--brass)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="scroll-x-top overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-xs text-text-3">
              <th className="px-4 py-2.5 font-medium">Resource</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Area</th>
              <th className="px-4 py-2.5 font-medium">Allocation</th>
              <th className="px-4 py-2.5 font-medium">Location</th>
              <th className="px-4 py-2.5 font-medium">Access</th>
              {canInvite && <th className="px-4 py-2.5 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((resource, i) => (
              <motion.tr
                key={resource.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.4) }}
                className="border-b border-border last:border-0 hover:bg-surface-2"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-medium text-on-brass"
                      style={{ background: "var(--brass)" }}
                    >
                      {initials(resource.full_name) || "?"}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-text">{resource.full_name}</div>
                      <div className="truncate text-xs text-text-3">{resource.email}</div>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-2.5 text-text-2">
                  {resource.consultant_type === "functional"
                    ? "Functional"
                    : resource.consultant_type === "technical"
                      ? "Technical"
                      : resource.consultant_type === "pmo"
                        ? "PMO"
                        : "—"}
                </td>

                <td className="px-4 py-2.5 text-text-2">{resource.role_title || "—"}</td>

                <td className="px-4 py-2.5 text-text-2">{resource.primary_module || "—"}</td>

                <td className="px-4 py-2.5">
                  {resource.allocations.length > 0 ? (
                    <div className="space-y-0.5">
                      {resource.allocations.map((a) => (
                        <div key={a.membership_id} className="text-xs text-text-2">
                          {a.project_name}: <span className="font-mono">{a.allocation_pct}%</span>
                        </div>
                      ))}
                      {resource.overAllocated && (
                        <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--status-overdue)" }}>
                          <IconAlertTriangle size={12} />
                          Over-allocated ({resource.activeAllocationTotal}%)
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="font-mono text-text-3">{resource.allocation_pct ?? 50}% planned</span>
                  )}
                </td>

                <td className="px-4 py-2.5 text-text-2">{LOCATION_LABEL[resource.location ?? ""] ?? "—"}</td>

                <td className="px-4 py-2.5">
                  {resource.invite_status === "invited" ? (
                    <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--status-live)" }}>
                      <IconCircleCheck size={14} />
                      Invited
                    </span>
                  ) : canInvite ? (
                    <InviteButton
                      resourceId={resource.id}
                      resourceName={resource.full_name}
                      defaultAllocationPct={resource.allocation_pct ?? 50}
                      defaultRole={resource.consultant_type === "pmo" ? "pmo" : "member"}
                      projectOptions={projectOptions}
                    />
                  ) : (
                    <span className="text-xs text-text-3">Not invited</span>
                  )}
                </td>

                {canInvite && (
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <EditResourceButton resource={resource} />
                      <DeleteResourceButton
                        resourceId={resource.id}
                        resourceName={resource.full_name}
                        onDeleted={() => removeRow(resource.id)}
                      />
                    </div>
                  </td>
                )}
              </motion.tr>
            ))}
          </tbody>
        </table>

        {filteredRows.length === 0 && (
          <p className="py-12 text-center text-sm text-text-3">No resources in this view.</p>
        )}
      </div>
    </div>
  );
}

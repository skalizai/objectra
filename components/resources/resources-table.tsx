"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { IconAlertTriangle, IconCircleCheck } from "@tabler/icons-react";
import { InviteButton } from "@/components/resources/invite-button";
import { DeleteResourceButton } from "@/components/resources/delete-resource-button";
import { useModules } from "@/components/providers/picklist-provider";
import { updateResource, updateResourceProjectAllocation } from "@/lib/actions/resources";
import type { ResourceWithAllocation } from "@/lib/data/resources";
import type { ConsultantType, ResourceLocation } from "@/lib/types/database";

const LOCATION_LABEL: Record<string, string> = { onsite: "Onsite", offshore: "Offshore" };
const ALLOCATIONS = [25, 50, 75, 100];

const selectClass =
  "h-8 rounded-[7px] border border-border-2 bg-surface-2 px-2 text-xs text-text-2 focus:border-brass focus-visible:outline-none";
const inputClass =
  "h-8 rounded-[7px] border border-border-2 bg-transparent px-2 text-sm text-text focus:border-brass focus-visible:outline-none";

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
  const modules = useModules();
  const [rows, setRows] = useState(resources);
  // `resources` is copied into local state so inline edits/deletes can
  // update optimistically without a full server round trip — but that
  // means this must resync whenever the parent re-renders with a
  // genuinely new list (e.g. a resource was just added elsewhere).
  // Adjusted during render (React's documented pattern for this) rather
  // than in an effect, which would cause an extra cascading render.
  const [prevResources, setPrevResources] = useState(resources);
  if (resources !== prevResources) {
    setPrevResources(resources);
    setRows(resources);
  }

  function patchRow(id: string, fields: Partial<ResourceWithAllocation>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...fields } : r)));
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border">
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
            {canInvite && <th className="px-4 py-2.5 font-medium"></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((resource, i) => (
            <motion.tr
              key={resource.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.4) }}
              className="border-b border-border last:border-0 hover:bg-surface-2 align-top"
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

              <td className="px-4 py-2.5">
                {canInvite ? (
                  <select
                    className={selectClass}
                    defaultValue={resource.consultant_type ?? ""}
                    onChange={(e) => {
                      const consultant_type = (e.target.value || null) as ConsultantType | null;
                      patchRow(resource.id, { consultant_type });
                      void updateResource(resource.id, { consultant_type });
                    }}
                  >
                    <option value="">—</option>
                    <option value="functional">Functional</option>
                    <option value="technical">Technical</option>
                  </select>
                ) : (
                  <span className="text-text-2">
                    {resource.consultant_type === "functional"
                      ? "Functional"
                      : resource.consultant_type === "technical"
                        ? "Technical"
                        : "—"}
                  </span>
                )}
              </td>

              <td className="px-4 py-2.5">
                {canInvite ? (
                  <input
                    defaultValue={resource.role_title ?? ""}
                    placeholder="Role"
                    className={`${inputClass} w-32`}
                    onBlur={(e) => {
                      const role_title = e.target.value || null;
                      if (role_title === resource.role_title) return;
                      patchRow(resource.id, { role_title });
                      void updateResource(resource.id, { role_title });
                    }}
                  />
                ) : (
                  <span className="text-text-2">{resource.role_title || "—"}</span>
                )}
              </td>

              <td className="px-4 py-2.5">
                {canInvite ? (
                  <select
                    className={selectClass}
                    defaultValue={resource.primary_module ?? ""}
                    onChange={(e) => {
                      const primary_module = e.target.value || null;
                      patchRow(resource.id, { primary_module });
                      void updateResource(resource.id, { primary_module });
                    }}
                  >
                    <option value="">—</option>
                    {modules.map((m) => (
                      <option key={m.id} value={m.value}>{m.value}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-text-2">{resource.primary_module || "—"}</span>
                )}
              </td>

              <td className="px-4 py-2.5">
                {resource.allocations.length > 0 ? (
                  <div className="space-y-1">
                    {resource.allocations.map((a) => (
                      <div key={a.membership_id} className="flex items-center gap-1.5">
                        <span className="text-xs text-text-3">{a.project_name}</span>
                        {canInvite ? (
                          <select
                            className={selectClass}
                            defaultValue={a.allocation_pct}
                            onChange={(e) => {
                              void updateResourceProjectAllocation(a.membership_id, Number(e.target.value));
                            }}
                          >
                            {ALLOCATIONS.map((pct) => (
                              <option key={pct} value={pct}>{pct}%</option>
                            ))}
                          </select>
                        ) : (
                          <span className="font-mono text-xs text-text-2">{a.allocation_pct}%</span>
                        )}
                      </div>
                    ))}
                    {resource.overAllocated && (
                      <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--status-overdue)" }}>
                        <IconAlertTriangle size={12} />
                        Over-allocated ({resource.activeAllocationTotal}%)
                      </span>
                    )}
                  </div>
                ) : canInvite ? (
                  <select
                    className={selectClass}
                    defaultValue={resource.allocation_pct ?? 50}
                    onChange={(e) => {
                      const allocation_pct = Number(e.target.value);
                      patchRow(resource.id, { allocation_pct });
                      void updateResource(resource.id, { allocation_pct });
                    }}
                  >
                    {ALLOCATIONS.map((pct) => (
                      <option key={pct} value={pct}>{pct}% planned</option>
                    ))}
                  </select>
                ) : (
                  <span className="font-mono text-text-3">{resource.allocation_pct ?? 50}% planned</span>
                )}
              </td>

              <td className="px-4 py-2.5">
                {canInvite ? (
                  <select
                    className={selectClass}
                    defaultValue={resource.location ?? ""}
                    onChange={(e) => {
                      const location = (e.target.value || null) as ResourceLocation | null;
                      patchRow(resource.id, { location });
                      void updateResource(resource.id, { location });
                    }}
                  >
                    <option value="">—</option>
                    <option value="onsite">Onsite</option>
                    <option value="offshore">Offshore</option>
                  </select>
                ) : (
                  <span className="text-text-2">{LOCATION_LABEL[resource.location ?? ""] ?? "—"}</span>
                )}
              </td>

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
                    projectOptions={projectOptions}
                  />
                ) : (
                  <span className="text-xs text-text-3">Not invited</span>
                )}
              </td>

              {canInvite && (
                <td className="px-4 py-2.5">
                  <DeleteResourceButton
                    resourceId={resource.id}
                    resourceName={resource.full_name}
                    onDeleted={() => removeRow(resource.id)}
                  />
                </td>
              )}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

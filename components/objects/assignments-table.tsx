"use client";

import { useMemo, useState } from "react";
import { WricefGlyph } from "@/components/ui/wricef-glyph";
import { useCompanyCodes, useModules, useStatuses, useStreams } from "@/components/providers/picklist-provider";
import { setObjectAssignee, updateObjectByManager } from "@/lib/actions/objects";
import type { ObjectWithAssignees } from "@/lib/data/objects";
import type { AssignedRole, ConsultantType, ObjectStatus } from "@/lib/types/database";

type ResourceOption = { id: string; full_name: string; email: string; consultant_type: ConsultantType | null };

const selectClass =
  "h-8 w-full rounded-[7px] border border-border-2 bg-surface-2 px-2 text-xs text-text-2 focus:border-brass focus-visible:outline-none";
const inputClass =
  "h-8 w-full rounded-[7px] border border-border-2 bg-surface-2 px-2 text-xs text-text focus:border-brass focus-visible:outline-none";

// Functional consultant slots should only offer functional-type resources,
// and technical (assigned_role "developer") slots only technical-type ones.
// consultant_type is a free-text Settings → Project Roles value now, so this
// matches case-insensitively rather than against a fixed enum.
const ROLE_CONSULTANT_TYPE: Record<AssignedRole, string> = {
  functional: "functional",
  developer: "technical",
};

function AssigneeSelect({
  obj,
  role,
  resources,
  onChange,
}: {
  obj: ObjectWithAssignees;
  role: AssignedRole;
  resources: ResourceOption[];
  onChange: (obj: ObjectWithAssignees, role: AssignedRole, resourceId: string | null) => void;
}) {
  const current = obj.assignees.find((a) => a.assigned_role === role);
  // Keep the currently assigned resource selectable even if their
  // consultant_type no longer matches, so an existing assignment never
  // silently disappears from the list.
  const eligible = resources.filter(
    (r) =>
      (r.consultant_type ?? "").trim().toLowerCase() === ROLE_CONSULTANT_TYPE[role] ||
      r.id === current?.resource.id,
  );
  return (
    <select
      className={selectClass}
      defaultValue={current?.resource.id ?? ""}
      onChange={(e) => onChange(obj, role, e.target.value || null)}
    >
      <option value="">Unassigned</option>
      {eligible.map((r) => (
        <option key={r.id} value={r.id}>{r.full_name}</option>
      ))}
    </select>
  );
}

export function AssignmentsTable({
  projectId,
  objects,
  resources,
}: {
  projectId: string;
  objects: ObjectWithAssignees[];
  resources: ResourceOption[];
}) {
  const statuses = useStatuses();
  const modules = useModules();
  const companyCodes = useCompanyCodes();
  const streams = useStreams();
  const [rows, setRows] = useState(objects);
  // See ResourcesTable for why this resync is needed.
  const [prevObjects, setPrevObjects] = useState(objects);
  if (objects !== prevObjects) {
    setPrevObjects(objects);
    setRows(objects);
  }

  const [companyCodeFilter, setCompanyCodeFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [businessUnitFilter, setBusinessUnitFilter] = useState("all");
  const [streamFilter, setStreamFilter] = useState("all");

  // business_unit has no Settings picklist behind it (unlike module/company
  // code/stream) -- its options are whatever values are actually present on
  // this project's objects, not a configured list.
  const businessUnits = useMemo(
    () => Array.from(new Set(rows.map((o) => o.business_unit).filter((v): v is string => !!v))).sort(),
    [rows],
  );

  const filtered = useMemo(
    () =>
      rows.filter((o) => {
        if (companyCodeFilter !== "all" && o.company_code !== companyCodeFilter) return false;
        if (moduleFilter !== "all" && o.module !== moduleFilter) return false;
        if (businessUnitFilter !== "all" && o.business_unit !== businessUnitFilter) return false;
        if (streamFilter !== "all" && o.stream !== streamFilter) return false;
        return true;
      }),
    [rows, companyCodeFilter, moduleFilter, businessUnitFilter, streamFilter],
  );

  function patchRow(id: string, fields: Partial<ObjectWithAssignees>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...fields } : r)));
  }

  function handleAssigneeChange(obj: ObjectWithAssignees, role: AssignedRole, resourceId: string | null) {
    const resource = resources.find((r) => r.id === resourceId);
    patchRow(obj.id, {
      assignees: [
        ...obj.assignees.filter((a) => a.assigned_role !== role),
        ...(resource ? [{ id: `pending-${resource.id}-${role}`, resource, assigned_role: role }] : []),
      ],
    });
    void setObjectAssignee(obj.id, projectId, resourceId, role);
  }

  const filterSelectClass =
    "h-9 rounded-control border border-border-2 bg-surface-2 px-2.5 text-sm text-text-2 focus:border-brass focus-visible:outline-none";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 pb-4">
        {companyCodes.length > 0 && (
          <select value={companyCodeFilter} onChange={(e) => setCompanyCodeFilter(e.target.value)} className={filterSelectClass}>
            <option value="all">All company codes</option>
            {companyCodes.map((c) => <option key={c.id} value={c.value}>{c.value}</option>)}
          </select>
        )}
        {modules.length > 0 && (
          <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className={filterSelectClass}>
            <option value="all">All modules</option>
            {modules.map((m) => <option key={m.id} value={m.value}>{m.value}</option>)}
          </select>
        )}
        {businessUnits.length > 0 && (
          <select value={businessUnitFilter} onChange={(e) => setBusinessUnitFilter(e.target.value)} className={filterSelectClass}>
            <option value="all">All business units</option>
            {businessUnits.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        )}
        {streams.length > 0 && (
          <select value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)} className={filterSelectClass}>
            <option value="all">All streams</option>
            {streams.map((s) => <option key={s.id} value={s.value}>{s.value}</option>)}
          </select>
        )}
      </div>

      <div className="scroll-x-top overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-xs text-text-3">
              <th className="px-4 py-2.5 font-medium">Object</th>
              <th className="px-4 py-2.5 font-medium">Functional consultant</th>
              <th className="px-4 py-2.5 font-medium">Technical consultant</th>
              <th className="px-4 py-2.5 font-medium">Stage</th>
              <th className="px-4 py-2.5 font-medium">Due date</th>
              <th className="px-4 py-2.5 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((obj) => (
              <tr key={obj.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2.5">
                    <WricefGlyph type={obj.object_type} size={20} />
                    <span className="truncate text-text">{obj.title}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <AssigneeSelect obj={obj} role="functional" resources={resources} onChange={handleAssigneeChange} />
                </td>
                <td className="px-4 py-2">
                  <AssigneeSelect obj={obj} role="developer" resources={resources} onChange={handleAssigneeChange} />
                </td>
                <td className="px-4 py-2">
                  <select
                    className={selectClass}
                    defaultValue={obj.status}
                    onChange={(e) => {
                      const status = e.target.value as ObjectStatus;
                      patchRow(obj.id, { status });
                      void updateObjectByManager(obj.id, projectId, { status });
                    }}
                  >
                    {statuses.map((s) => (
                      <option key={s.id} value={s.value}>{s.value}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input
                    type="date"
                    className={inputClass}
                    defaultValue={obj.due_date ?? ""}
                    onBlur={(e) => {
                      const due_date = e.target.value || undefined;
                      void updateObjectByManager(obj.id, projectId, { due_date });
                    }}
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    className={inputClass}
                    defaultValue={obj.admin_note ?? ""}
                    placeholder="Note…"
                    onBlur={(e) => {
                      const admin_note = e.target.value;
                      void updateObjectByManager(obj.id, projectId, { admin_note });
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-text-3">
            {rows.length === 0 ? "No objects in this project yet." : "No objects match these filters."}
          </p>
        )}
      </div>
    </div>
  );
}

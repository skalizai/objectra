"use client";

import { useState } from "react";
import { WricefGlyph } from "@/components/ui/wricef-glyph";
import { useStatuses } from "@/components/providers/picklist-provider";
import { setObjectAssignee, updateObjectByManager } from "@/lib/actions/objects";
import type { ObjectWithAssignees } from "@/lib/data/objects";
import type { AssignedRole, ObjectStatus } from "@/lib/types/database";

type ResourceOption = { id: string; full_name: string; email: string };

const selectClass =
  "h-8 w-full rounded-[7px] border border-border-2 bg-surface-2 px-2 text-xs text-text-2 focus:border-brass focus-visible:outline-none";
const inputClass =
  "h-8 w-full rounded-[7px] border border-border-2 bg-surface-2 px-2 text-xs text-text focus:border-brass focus-visible:outline-none";

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
  return (
    <select
      className={selectClass}
      defaultValue={current?.resource.id ?? ""}
      onChange={(e) => onChange(obj, role, e.target.value || null)}
    >
      <option value="">Unassigned</option>
      {resources.map((r) => (
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
  const [rows, setRows] = useState(objects);
  // See ResourcesTable for why this resync is needed.
  const [prevObjects, setPrevObjects] = useState(objects);
  if (objects !== prevObjects) {
    setPrevObjects(objects);
    setRows(objects);
  }

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

  return (
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
          {rows.map((obj) => (
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

      {rows.length === 0 && <p className="py-12 text-center text-sm text-text-3">No objects in this project yet.</p>}
    </div>
  );
}

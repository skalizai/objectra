"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { WricefGlyph } from "@/components/ui/wricef-glyph";
import { Label } from "@/components/ui/input";
import {
  useCompanyCodes,
  useComplexities,
  useModules,
  useStatuses,
  useStreams,
} from "@/components/providers/picklist-provider";
import { setObjectAssignee, updateObjectByManager } from "@/lib/actions/objects";
import type { ObjectWithAssignees } from "@/lib/data/objects";
import type { AssignedRole, ConsultantType } from "@/lib/types/database";

type ResourceOption = { id: string; full_name: string; email: string; consultant_type: ConsultantType | null };

const selectClass =
  "h-9 w-full rounded-control border border-border-2 bg-surface-2 px-2.5 text-sm text-text focus:border-brass focus-visible:outline-none";

// Functional consultant slots should only offer functional-type resources,
// and technical (assigned_role "developer") slots only technical-type ones.
const ROLE_CONSULTANT_TYPE: Record<AssignedRole, ConsultantType> = {
  functional: "functional",
  developer: "technical",
};

function ConsultantSelect({
  object,
  role,
  resources,
  canEdit,
  onAssign,
}: {
  object: ObjectWithAssignees;
  role: AssignedRole;
  resources: ResourceOption[];
  canEdit: boolean;
  onAssign: (role: AssignedRole, resourceId: string | null) => void;
}) {
  const current = object.assignees.find((a) => a.assigned_role === role);

  if (!canEdit) {
    return <p className="text-sm text-text-2">{current?.resource.full_name ?? "—"}</p>;
  }

  // Keep the currently assigned resource selectable even if their
  // consultant_type no longer matches (e.g. changed after assignment),
  // so an existing assignment never silently disappears from the list.
  const eligible = resources.filter(
    (r) => r.consultant_type === ROLE_CONSULTANT_TYPE[role] || r.id === current?.resource.id,
  );

  return (
    <select
      className={selectClass}
      value={current?.resource.id ?? ""}
      onChange={(e) => onAssign(role, e.target.value || null)}
    >
      <option value="">Unassigned</option>
      {eligible.map((r) => (
        <option key={r.id} value={r.id}>{r.full_name}</option>
      ))}
    </select>
  );
}

/** Keyed by object.id from the parent, so switching which object is
 * selected always mounts a fresh instance — local edit state never needs
 * to be manually reconciled against a changing `object` prop. */
function ObjectDetailForm({
  object,
  projectId,
  canEdit,
  resources,
}: {
  object: ObjectWithAssignees;
  projectId: string;
  canEdit: boolean;
  resources: ResourceOption[];
}) {
  const modules = useModules();
  const complexities = useComplexities();
  const statuses = useStatuses();
  const companyCodes = useCompanyCodes();
  const streams = useStreams();
  const [local, setLocal] = useState(object);

  function patch(fields: Parameters<typeof updateObjectByManager>[2]) {
    setLocal((prev) => ({ ...prev, ...fields }));
    void updateObjectByManager(local.id, projectId, fields);
  }

  function handleAssign(role: AssignedRole, resourceId: string | null) {
    const resource = resources.find((r) => r.id === resourceId);
    setLocal((prev) => ({
      ...prev,
      assignees: [
        ...prev.assignees.filter((a) => a.assigned_role !== role),
        ...(resource ? [{ id: `pending-${resource.id}-${role}`, resource, assigned_role: role }] : []),
      ],
    }));
    void setObjectAssignee(local.id, projectId, resourceId, role);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <WricefGlyph type={local.object_type} size={28} />
        <div>
          <div className="text-sm text-text">{local.object_type}</div>
          <div className="font-mono text-xs text-text-3">{local.wricef_id || "Generating…"}</div>
        </div>
      </div>

      <div>
        <Label>Status</Label>
        {canEdit ? (
          <select className={selectClass} value={local.status} onChange={(e) => patch({ status: e.target.value })}>
            {statuses.map((s) => (
              <option key={s.id} value={s.value}>{s.value}</option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-text-2">{local.status}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Module</Label>
          {canEdit ? (
            <select className={selectClass} value={local.module ?? ""} onChange={(e) => patch({ module: e.target.value })}>
              <option value="">—</option>
              {modules.map((m) => (
                <option key={m.id} value={m.value}>{m.value}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-text-2">{local.module || "—"}</p>
          )}
        </div>
        <div>
          <Label>Complexity</Label>
          {canEdit ? (
            <select
              className={selectClass}
              value={local.complexity ?? ""}
              onChange={(e) => patch({ complexity: e.target.value })}
            >
              <option value="">—</option>
              {complexities.map((c) => (
                <option key={c.id} value={c.value}>{c.value}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-text-2">{local.complexity || "—"}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Company code</Label>
          {canEdit ? (
            <select
              className={selectClass}
              value={local.company_code ?? ""}
              onChange={(e) => patch({ company_code: e.target.value })}
            >
              <option value="">—</option>
              {companyCodes.map((c) => (
                <option key={c.id} value={c.value}>{c.value}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-text-2">{local.company_code || "—"}</p>
          )}
        </div>
        <div>
          <Label>Business unit</Label>
          {canEdit ? (
            <input
              type="text"
              maxLength={10}
              defaultValue={local.business_unit ?? ""}
              onBlur={(e) => patch({ business_unit: e.target.value.slice(0, 10) || undefined })}
              placeholder="e.g. US10"
              className={selectClass}
            />
          ) : (
            <p className="text-sm text-text-2">{local.business_unit || "—"}</p>
          )}
        </div>
        <div>
          <Label>Stream</Label>
          {canEdit ? (
            <select
              className={selectClass}
              value={local.stream ?? ""}
              onChange={(e) => patch({ stream: e.target.value })}
            >
              <option value="">—</option>
              {streams.map((s) => (
                <option key={s.id} value={s.value}>{s.value}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-text-2">{local.stream || "—"}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Functional consultant</Label>
          <ConsultantSelect object={local} role="functional" resources={resources} canEdit={canEdit} onAssign={handleAssign} />
        </div>
        <div>
          <Label>Technical consultant</Label>
          <ConsultantSelect object={local} role="developer" resources={resources} canEdit={canEdit} onAssign={handleAssign} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>FDS received</Label>
          {canEdit ? (
            <select
              className={selectClass}
              value={local.fds_received ? "yes" : "no"}
              onChange={(e) => patch({ fds_received: e.target.value === "yes" })}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          ) : (
            <p className="text-sm text-text-2">{local.fds_received ? "Yes" : "No"}</p>
          )}
        </div>
        <div>
          <Label>Due date</Label>
          {canEdit ? (
            <input
              type="date"
              defaultValue={local.due_date ?? ""}
              onChange={(e) => patch({ due_date: e.target.value || undefined })}
              className={selectClass}
            />
          ) : (
            <p className="text-sm text-text-2">{local.due_date ?? "—"}</p>
          )}
        </div>
      </div>

      <div>
        <Label>Description</Label>
        {canEdit ? (
          <textarea
            defaultValue={local.description ?? ""}
            onBlur={(e) => patch({ description: e.target.value })}
            rows={3}
            placeholder="Description of the technical object…"
            className="w-full resize-none rounded-control border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text focus:border-brass focus-visible:outline-none"
          />
        ) : (
          <p className="text-sm text-text-2">{local.description || "—"}</p>
        )}
      </div>

      <div>
        <Label>Admin note</Label>
        {canEdit ? (
          <textarea
            defaultValue={local.admin_note ?? ""}
            onBlur={(e) => patch({ admin_note: e.target.value })}
            rows={3}
            className="w-full resize-none rounded-control border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text focus:border-brass focus-visible:outline-none"
          />
        ) : (
          <p className="text-sm text-text-2">{local.admin_note || "—"}</p>
        )}
      </div>
    </div>
  );
}

export function ObjectDetailDrawer({
  object,
  projectId,
  canEdit,
  resources,
  onClose,
}: {
  object: ObjectWithAssignees | null;
  projectId: string;
  canEdit: boolean;
  resources: ResourceOption[];
  onClose: () => void;
}) {
  return (
    <Drawer open={!!object} onClose={onClose} title={object?.title ?? ""} width={480}>
      {object && (
        <ObjectDetailForm key={object.id} object={object} projectId={projectId} canEdit={canEdit} resources={resources} />
      )}
    </Drawer>
  );
}

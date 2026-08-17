"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { IconCheck, IconSearch, IconX } from "@tabler/icons-react";
import { WricefGlyph } from "@/components/ui/wricef-glyph";
import { StatusPill } from "@/components/ui/status-pill";
import { ObjectDetailDrawer } from "@/components/objects/object-detail-drawer";
import { useModules, useStatuses } from "@/components/providers/picklist-provider";
import { OBJECT_TYPE_META } from "@/lib/object-meta";
import type { ObjectWithAssignees } from "@/lib/data/objects";
import type { ConsultantType, ObjectStatus, ObjectType } from "@/lib/types/database";

type ResourceOption = { id: string; full_name: string; email: string; consultant_type: ConsultantType | null };

function consultantName(obj: ObjectWithAssignees, role: "functional" | "developer") {
  return obj.assignees.find((a) => a.assigned_role === role)?.resource.full_name ?? "—";
}

export function ObjectsRegister({
  projectId,
  objects,
  canEdit,
  resources,
}: {
  projectId: string;
  objects: ObjectWithAssignees[];
  canEdit: boolean;
  resources: ResourceOption[];
}) {
  const modules = useModules();
  const statuses = useStatuses();
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<ObjectType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ObjectStatus | "all">("all");
  // Local copy of `objects` for optimistic title edits — see PipelineBoard
  // for why the resync happens during render rather than in an effect.
  const [items, setItems] = useState(objects);
  const [prevObjects, setPrevObjects] = useState(objects);
  if (objects !== prevObjects) {
    setPrevObjects(objects);
    setItems(objects);
  }

  const [selected, setSelected] = useState<ObjectWithAssignees | null>(null);
  // Keep the open drawer's title in sync with the row if it's patched while
  // still selected, same reasoning as PipelineBoard's selectedLive.
  const selectedLive = selected ? items.find((o) => o.id === selected.id) ?? null : null;

  function handleTitleChange(objectId: string, title: string) {
    setItems((prev) => prev.map((o) => (o.id === objectId ? { ...o, title } : o)));
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((o) => {
      if (q && !`${o.title} ${o.wricef_id ?? ""}`.toLowerCase().includes(q)) return false;
      if (moduleFilter !== "all" && o.module !== moduleFilter) return false;
      if (typeFilter !== "all" && o.object_type !== typeFilter) return false;
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      return true;
    });
  }, [items, search, moduleFilter, typeFilter, statusFilter]);

  const selectClass =
    "h-9 rounded-control border border-border-2 bg-surface-2 px-2.5 text-sm text-text-2 focus:border-brass focus-visible:outline-none";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 pb-4">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or object ID…"
            className="h-9 w-full rounded-control border border-border-2 bg-surface-2 pl-9 pr-3 text-sm text-text placeholder:text-text-3 focus:border-brass focus-visible:outline-none"
          />
        </div>

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ObjectType | "all")} className={selectClass}>
          <option value="all">All types</option>
          {Object.keys(OBJECT_TYPE_META).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.value}>{s.value}</option>
          ))}
        </select>

        {modules.length > 0 && (
          <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className={selectClass}>
            <option value="all">All modules</option>
            {modules.map((m) => <option key={m.id} value={m.value}>{m.value}</option>)}
          </select>
        )}
      </div>

      <div className="scroll-x-top overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[1420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-xs text-text-3">
              <th className="px-4 py-2.5 font-medium">Object ID</th>
              <th className="px-4 py-2.5 font-medium">Title</th>
              <th className="px-4 py-2.5 font-medium">Module</th>
              <th className="px-4 py-2.5 font-medium">Complexity</th>
              <th className="px-4 py-2.5 font-medium">Company code</th>
              <th className="px-4 py-2.5 font-medium">Business unit</th>
              <th className="px-4 py-2.5 font-medium">Stream</th>
              <th className="px-4 py-2.5 font-medium">Functional consultant</th>
              <th className="px-4 py-2.5 font-medium">Technical consultant</th>
              <th className="px-4 py-2.5 font-medium">FDS</th>
              <th className="px-4 py-2.5 font-medium">Due</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((obj, i) => (
              <motion.tr
                key={obj.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.4) }}
                onClick={() => setSelected(obj)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2"
              >
                <td className="px-4 py-2.5 font-mono text-xs text-text-2">{obj.wricef_id || "—"}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <WricefGlyph type={obj.object_type} size={22} />
                    <span className="min-w-0 truncate text-text">{obj.title}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-text-2">{obj.module || "—"}</td>
                <td className="px-4 py-2.5 text-text-2">{obj.complexity || "—"}</td>
                <td className="px-4 py-2.5 text-text-2">{obj.company_code || "—"}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-text-2">{obj.business_unit || "—"}</td>
                <td className="px-4 py-2.5 text-text-2">{obj.stream || "—"}</td>
                <td className="px-4 py-2.5 text-text-2">{consultantName(obj, "functional")}</td>
                <td className="px-4 py-2.5 text-text-2">{consultantName(obj, "developer")}</td>
                <td className="px-4 py-2.5">
                  {obj.fds_received ? (
                    <IconCheck size={16} style={{ color: "var(--status-live)" }} />
                  ) : (
                    <IconX size={16} className="text-text-3" />
                  )}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-text-2">
                  {obj.due_date ? format(new Date(obj.due_date), "dd MMM yyyy") : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <StatusPill status={obj.status} dueDate={obj.due_date} />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-text-3">No objects match these filters.</p>
        )}
      </div>

      <ObjectDetailDrawer
        object={selectedLive}
        projectId={projectId}
        canEdit={canEdit}
        resources={resources}
        onClose={() => setSelected(null)}
        onTitleChange={handleTitleChange}
      />
    </div>
  );
}

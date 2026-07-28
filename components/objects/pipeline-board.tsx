"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { WricefGlyph } from "@/components/ui/wricef-glyph";
import { ObjectDetailDrawer } from "@/components/objects/object-detail-drawer";
import { updateObjectByManager } from "@/lib/actions/objects";
import { useStatuses } from "@/components/providers/picklist-provider";
import { FALLBACK_STATUS_COLOR } from "@/lib/object-meta";
import type { ObjectWithAssignees } from "@/lib/data/objects";
import type { ObjectStatus } from "@/lib/types/database";

type ResourceOption = { id: string; full_name: string; email: string };

export function PipelineBoard({
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
  const statuses = useStatuses();
  const [items, setItems] = useState(objects);
  // See ResourcesTable for why this resync is needed: `objects` is copied
  // into local state for optimistic drag/drop-style updates, so this must
  // catch up whenever the parent re-renders with a genuinely new list
  // while this component stays mounted (e.g. staying on this tab while
  // objects change elsewhere). Adjusted during render, not in an effect.
  const [prevObjects, setPrevObjects] = useState(objects);
  if (objects !== prevObjects) {
    setPrevObjects(objects);
    setItems(objects);
  }

  const [selected, setSelected] = useState<ObjectWithAssignees | null>(null);
  // Keep the open drawer in sync if this same object gets patched (status,
  // assignees, etc.) while it's still selected, same reasoning as above.
  const selectedLive = selected ? items.find((o) => o.id === selected.id) ?? null : null;

  function move(objectId: string, status: ObjectStatus) {
    setItems((prev) => prev.map((o) => (o.id === objectId ? { ...o, status } : o)));
    void updateObjectByManager(objectId, projectId, { status });
  }

  return (
    <>
      <div className="scroll-x-top flex gap-4 overflow-x-auto pb-2 pt-5">
        {statuses.map((column) => {
          const columnItems = items.filter((o) => o.status === column.value);
          return (
            <div key={column.id} className="w-[260px] shrink-0">
              <div className="mb-2 flex items-center gap-2 px-1">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: column.color ?? FALLBACK_STATUS_COLOR }}
                />
                <h3 className="text-sm font-medium text-text-2">{column.value}</h3>
                <span className="ml-auto font-mono text-xs text-text-3">{columnItems.length}</span>
              </div>

              <div className="space-y-2 rounded-card border border-border bg-surface-2/40 p-2 min-h-[120px]">
                {columnItems.map((obj, i) => (
                  <motion.div
                    key={obj.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.02 }}
                    onClick={() => setSelected(obj)}
                    className="cursor-pointer rounded-control border border-border bg-surface p-3 hover:border-border-2"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    <div className="flex items-start gap-2">
                      <WricefGlyph type={obj.object_type} size={20} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-text">{obj.title}</div>
                        {obj.wricef_id && <div className="font-mono text-xs text-text-3">{obj.wricef_id}</div>}
                      </div>
                    </div>

                    {canEdit && (
                      <select
                        value={obj.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => move(obj.id, e.target.value as ObjectStatus)}
                        className="mt-2.5 h-7 w-full rounded-[7px] border border-border-2 bg-surface-2 px-1.5 text-xs text-text-2 focus:border-brass focus-visible:outline-none"
                      >
                        {statuses.map((s) => (
                          <option key={s.id} value={s.value}>{s.value}</option>
                        ))}
                      </select>
                    )}
                  </motion.div>
                ))}
                {columnItems.length === 0 && (
                  <p className="px-1 py-3 text-center text-xs text-text-3">Nothing here</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ObjectDetailDrawer
        object={selectedLive}
        projectId={projectId}
        canEdit={canEdit}
        resources={resources}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

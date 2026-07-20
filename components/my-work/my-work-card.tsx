"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { WricefGlyph } from "@/components/ui/wricef-glyph";
import { StatusPill } from "@/components/ui/status-pill";
import { useStatuses } from "@/components/providers/picklist-provider";
import { memberUpdateObject } from "@/lib/actions/objects";
import type { MyWorkItem } from "@/lib/data/my-work";
import type { ObjectStatus } from "@/lib/types/database";

export function MyWorkCard({ item, index }: { item: MyWorkItem; index: number }) {
  const statuses = useStatuses();
  const [status, setStatus] = useState(item.status);
  const [note, setNote] = useState(item.admin_note ?? "");
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  function saveStatus(next: ObjectStatus) {
    setStatus(next);
    startTransition(() => {
      memberUpdateObject(item.id, { status: next });
    });
  }

  function saveNote() {
    startTransition(() => {
      memberUpdateObject(item.id, { admin_note: note });
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.4) }}
      className="rounded-card border border-border bg-surface p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start gap-3">
        <WricefGlyph type={item.object_type} size={24} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-text">{item.title}</div>
          <div className="mt-0.5 truncate text-xs text-text-3">
            {item.project_name}
            {item.wricef_id ? ` · ${item.wricef_id}` : ""}
          </div>
        </div>
        <StatusPill status={status} dueDate={item.due_date} className="shrink-0" />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-text-3">
        <span>{item.due_date ? `Due ${format(new Date(item.due_date), "dd MMM yyyy")}` : "No due date"}</span>
        <button onClick={() => setExpanded((e) => !e)} className="text-brass hover:underline">
          {expanded ? "Close" : "Update"}
        </button>
      </div>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 space-y-2 overflow-hidden border-t border-border pt-3"
        >
          <select
            value={status}
            onChange={(e) => saveStatus(e.target.value as ObjectStatus)}
            disabled={isPending}
            className="h-9 w-full rounded-control border border-border-2 bg-surface-2 px-2.5 text-sm text-text focus:border-brass focus-visible:outline-none"
          >
            {statuses.map((s) => (
              <option key={s.id} value={s.value}>{s.value}</option>
            ))}
          </select>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={saveNote}
            rows={2}
            placeholder="Add a note…"
            className="w-full resize-none rounded-control border border-border-2 bg-surface-2 px-2.5 py-2 text-sm text-text focus:border-brass focus-visible:outline-none"
          />
        </motion.div>
      )}
    </motion.div>
  );
}

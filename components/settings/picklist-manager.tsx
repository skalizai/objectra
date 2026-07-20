"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { IconAlertCircle, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { addPicklistItem, removePicklistItem, type PicklistActionState } from "@/lib/actions/picklists";
import type { Picklist, PicklistType } from "@/lib/types/database";

const initialState: PicklistActionState = { error: null };

export function PicklistManager({
  type,
  title,
  description,
  items,
  supportsColorAndDone = false,
}: {
  type: PicklistType;
  title: string;
  description: string;
  items: Picklist[];
  supportsColorAndDone?: boolean;
}) {
  const boundAction = addPicklistItem.bind(null, type);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  // Purely additive — never needs to be reconciled against the `items`
  // prop, so there's no render-phase state sync to get wrong.
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const rows = items.filter((item) => !removedIds.has(item.id));
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, state.error]);

  function handleRemove(id: string) {
    setRemovedIds((prev) => new Set(prev).add(id));
    removePicklistItem(id);
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <h3 className="font-display text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-text-3">{description}</p>

      <ul className="mt-4 space-y-1.5">
        {rows.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-control border border-border bg-surface-2 px-3 py-2 text-sm"
          >
            <span className="flex items-center gap-2">
              {supportsColorAndDone && (
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: item.color ?? "var(--status-process-pending)" }}
                />
              )}
              {item.value}
              {item.is_done && (
                <span className="rounded-full border border-border-2 px-1.5 py-0.5 text-[10px] text-text-3">
                  counts as done
                </span>
              )}
            </span>
            <button
              onClick={() => handleRemove(item.id)}
              className="text-text-3 hover:text-status-overdue"
              aria-label={`Remove ${item.value}`}
            >
              <IconTrash size={14} />
            </button>
          </li>
        ))}
        {rows.length === 0 && <p className="text-sm text-text-3">Nothing added yet.</p>}
      </ul>

      {state.error && (
        <div
          className="mt-3 flex items-start gap-2 rounded-control border px-3 py-2 text-xs"
          style={{ borderColor: "var(--status-overdue)", color: "var(--status-overdue)" }}
        >
          <IconAlertCircle size={14} className="mt-0.5 shrink-0" />
          {state.error}
        </div>
      )}

      <form ref={formRef} action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
        <input
          name="value"
          required
          placeholder={type === "module" ? "e.g. MM" : type === "complexity" ? "e.g. Medium" : "e.g. In Review"}
          className="h-9 flex-1 min-w-[140px] rounded-control border border-border-2 bg-surface-2 px-2.5 text-sm text-text placeholder:text-text-3 focus:border-brass focus-visible:outline-none"
        />
        {supportsColorAndDone && (
          <>
            <input
              name="color"
              type="color"
              defaultValue="#7A8492"
              className="h-9 w-9 rounded-control border border-border-2 bg-surface-2 p-1"
              aria-label="Colour"
            />
            <label className="flex items-center gap-1.5 text-xs text-text-2">
              <input type="checkbox" name="is_done" />
              Counts as done
            </label>
          </>
        )}
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </form>
    </div>
  );
}

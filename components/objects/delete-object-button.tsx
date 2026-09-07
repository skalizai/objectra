"use client";

import { useState, useTransition } from "react";
import { IconTrash } from "@tabler/icons-react";
import { deleteObject } from "@/lib/actions/objects";

export function DeleteObjectButton({
  objectId,
  objectLabel,
  projectId,
  onDeleted,
}: {
  objectId: string;
  objectLabel: string;
  projectId: string;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1.5 text-xs text-text-3 hover:text-status-overdue"
        aria-label={`Delete ${objectLabel}`}
      >
        <IconTrash size={13} />
        Delete object
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {error && (
        <span className="text-[11px]" style={{ color: "var(--status-overdue)" }}>
          {error}
        </span>
      )}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-text-3">Delete {objectLabel} permanently?</span>
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteObject(objectId, projectId);
              if (result.error) {
                setError(result.error);
                return;
              }
              onDeleted();
            })
          }
          className="rounded-[6px] px-1.5 py-0.5 text-[11px] font-medium text-white"
          style={{ background: "var(--status-overdue)" }}
        >
          {isPending ? "…" : "Yes"}
        </button>
        <button disabled={isPending} onClick={() => setConfirming(false)} className="text-[11px] text-text-3 hover:text-text-2">
          Cancel
        </button>
      </div>
    </div>
  );
}

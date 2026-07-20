"use client";

import { useStatusMeta } from "@/components/providers/picklist-provider";
import { isOverdue } from "@/lib/object-meta";
import { cn } from "@/lib/utils";

export function StatusPill({
  status,
  dueDate = null,
  className,
}: {
  status: string;
  dueDate?: string | null;
  className?: string;
}) {
  const meta = useStatusMeta(status);
  const overdue = isOverdue(dueDate, meta.isDone);
  const label = overdue ? "Overdue" : meta.label;
  const colorVar = overdue ? "var(--status-overdue)" : meta.colorVar;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
      style={{ borderColor: colorVar, color: colorVar, borderWidth: 1.5 }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: colorVar }} />
      {label}
    </span>
  );
}

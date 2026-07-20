import type { ObjectType, Picklist } from "@/lib/types/database";

export const OBJECT_TYPE_META: Record<ObjectType, { letter: string; colorVar: string }> = {
  Workflow: { letter: "W", colorVar: "var(--type-w)" },
  Report: { letter: "R", colorVar: "var(--type-r)" },
  Interface: { letter: "I", colorVar: "var(--type-i)" },
  Conversion: { letter: "C", colorVar: "var(--type-c)" },
  Enhancement: { letter: "E", colorVar: "var(--type-e)" },
  Form: { letter: "F", colorVar: "var(--type-f)" },
  Application: { letter: "A", colorVar: "var(--type-a)" },
};

export const FALLBACK_STATUS_COLOR = "var(--status-process-pending)";

/** Status is now an org-managed free-text picklist value (Settings), not a
 * fixed enum — "done" objects (usually "Live") are whichever the admin
 * flagged with is_done, so overdue/completion logic looks that up instead
 * of comparing against a hard-coded string. */
export function isDoneStatus(status: string, statuses: Pick<Picklist, "value" | "is_done">[]): boolean {
  return statuses.find((s) => s.value === status)?.is_done ?? false;
}

export function isOverdue(dueDate: string | null, isDone: boolean): boolean {
  if (!dueDate || isDone) return false;
  return new Date(dueDate).getTime() < Date.now();
}

export function resolveStatusColor(status: string, statuses: Pick<Picklist, "value" | "color">[]): string {
  return statuses.find((s) => s.value === status)?.color ?? FALLBACK_STATUS_COLOR;
}

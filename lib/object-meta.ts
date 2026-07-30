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

/** The due date on an object is a development deadline — it only counts
 * as "at risk" while the object is actively in this status. Once it moves
 * anywhere else (development finished and it progressed, or it hasn't
 * started yet), that due date stops being a live concern. Matches the
 * literal Settings → Object statuses value. */
export const DEVELOPMENT_STATUS = "Development in Progress";

/** Matches the literal Settings → Object statuses value where the
 * functional consultant is expected to be actively testing (see
 * lib/email/notify-status-change.ts, which fires the same-named trigger). */
export const FUNCTIONAL_TESTING_STATUS = "Functional Testing in Quality";

export function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status !== DEVELOPMENT_STATUS) return false;
  return new Date(dueDate).getTime() < Date.now();
}

export function resolveStatusColor(status: string, statuses: Pick<Picklist, "value" | "color">[]): string {
  return statuses.find((s) => s.value === status)?.color ?? FALLBACK_STATUS_COLOR;
}

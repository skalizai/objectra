import type { PicklistBundle } from "@/lib/data/picklists";

/** Fallback shown on public/marketing pages (no org context yet) and used
 * to seed a new org's Settings — mirrors the values in supabase/seed.sql. */
export const DEFAULT_STATUS_LABELS = [
  { value: "Process/Pending", color: "#7A8492", is_done: false },
  { value: "In Progress", color: "#E0A340", is_done: false },
  { value: "Dev/Func Testing", color: "#34C6D6", is_done: false },
  { value: "Testing in QA", color: "#4C8DF6", is_done: false },
  { value: "Validation", color: "#9A7CF7", is_done: false },
  { value: "Live", color: "#35C08A", is_done: true },
] as const;

export const DEFAULT_PICKLIST_BUNDLE: PicklistBundle = {
  modules: [],
  complexities: [],
  companyCodes: [],
  streams: [],
  projectRoles: [],
  statuses: DEFAULT_STATUS_LABELS.map((s, i) => ({
    id: `default-${i}`,
    org_id: "",
    type: "status",
    value: s.value,
    color: s.color,
    is_done: s.is_done,
    sort_order: i,
    is_active: true,
    created_at: "",
    updated_at: "",
  })),
};

import { formatDistanceToNow } from "date-fns";

const FIELD_LABEL: Record<string, string> = {
  status: "status",
  title: "title",
  module: "module",
  wave: "wave",
  priority: "priority",
  due_date: "due date",
  admin_note: "admin note",
  comments: "comments",
  comments2: "comments",
};

export function AuditTrail({
  entries,
}: {
  entries: Array<{
    id: string;
    object_title: string;
    field: string;
    old_value: string | null;
    new_value: string | null;
    changed_at: string;
    changed_by_profile?: { full_name: string } | null;
  }>;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <h3 className="font-display text-sm font-semibold text-text">Audit trail</h3>

      {entries.length === 0 ? (
        <p className="mt-6 text-center text-sm text-text-3">No changes recorded yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {entries.map((entry) => (
            <li key={entry.id} className="py-2.5 text-sm">
              <span className="text-text">{entry.changed_by_profile?.full_name ?? "Someone"}</span>{" "}
              <span className="text-text-2">
                changed {FIELD_LABEL[entry.field] ?? entry.field} on{" "}
              </span>
              <span className="text-text">{entry.object_title}</span>
              <span className="text-text-2">
                {" "}
                from <span className="text-text-3">{entry.old_value || "—"}</span> to{" "}
                <span className="text-text-3">{entry.new_value || "—"}</span>
              </span>
              <div className="mt-0.5 text-xs text-text-3">
                {formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

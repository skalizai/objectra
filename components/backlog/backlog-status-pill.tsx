import { cn } from "@/lib/utils";
import type { BacklogItemStatus } from "@/lib/types/database";

const STATUS_META: Record<BacklogItemStatus, { label: string; color: string }> = {
  registered: { label: "Registered", color: "#7A8492" },
  sent_for_approval: { label: "Sent for approval", color: "#E0A340" },
  approved: { label: "Approved", color: "#35C08A" },
  rejected: { label: "Rejected", color: "#F0574B" },
  on_hold: { label: "On hold", color: "#9A7CF7" },
  moved_to_objects: { label: "Moved to objects", color: "#4C8DF6" },
};

export function BacklogStatusPill({ status, className }: { status: BacklogItemStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", className)}
      style={{ borderColor: meta.color, color: meta.color, borderWidth: 1.5 }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

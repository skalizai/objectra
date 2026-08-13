import { cn } from "@/lib/utils";
import type { TicketCriticality } from "@/lib/types/database";

const CRITICALITY_META: Record<TicketCriticality, { label: string; color: string }> = {
  P1_critical: { label: "P1 · Critical", color: "#F0574B" },
  P2_high: { label: "P2 · High", color: "#E0A340" },
  P3_medium: { label: "P3 · Medium", color: "#4C8DF6" },
  P4_low: { label: "P4 · Low", color: "#7A8492" },
};

export function CriticalityPill({ criticality, className }: { criticality: TicketCriticality; className?: string }) {
  const meta = CRITICALITY_META[criticality];
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

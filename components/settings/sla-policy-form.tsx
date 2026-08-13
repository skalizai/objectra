"use client";

import { useState } from "react";
import { upsertSlaPolicy } from "@/lib/actions/support-settings";
import type { SlaPolicy, TicketCriticality } from "@/lib/types/database";

const inputClass =
  "h-8 w-20 rounded-[7px] border border-border-2 bg-surface-2 px-2 text-xs text-text focus:border-brass focus-visible:outline-none";

const CRITICALITY_LABEL: Record<TicketCriticality, string> = {
  P1_critical: "P1 · Critical",
  P2_high: "P2 · High",
  P3_medium: "P3 · Medium",
  P4_low: "P4 · Low",
};
const CRITICALITIES: TicketCriticality[] = ["P1_critical", "P2_high", "P3_medium", "P4_low"];

function hoursFromMins(mins: number) {
  return Math.round((mins / 60) * 10) / 10;
}

export function SlaPolicyForm({ projectId, policies }: { projectId: string; policies: SlaPolicy[] }) {
  const [rows, setRows] = useState<Record<TicketCriticality, { response_mins: number; resolve_mins: number }>>(() => {
    const byCriticality = Object.fromEntries(policies.map((p) => [p.criticality, p])) as Record<TicketCriticality, SlaPolicy>;
    return Object.fromEntries(
      CRITICALITIES.map((c) => [c, { response_mins: byCriticality[c]?.response_mins ?? 0, resolve_mins: byCriticality[c]?.resolve_mins ?? 0 }]),
    ) as Record<TicketCriticality, { response_mins: number; resolve_mins: number }>;
  });

  async function save(criticality: TicketCriticality, field: "response_mins" | "resolve_mins", hours: number) {
    const mins = Math.round(hours * 60);
    const next = { ...rows[criticality], [field]: mins };
    setRows((prev) => ({ ...prev, [criticality]: next }));
    await upsertSlaPolicy(projectId, criticality, next.response_mins, next.resolve_mins);
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <h3 className="font-display text-sm font-semibold">SLA policy</h3>
      <p className="mt-1 text-xs text-text-3">Response and resolution targets (hours), per criticality.</p>

      <table className="mt-4 w-full text-xs">
        <thead>
          <tr className="text-left text-text-3">
            <th className="pb-2 font-medium">Criticality</th>
            <th className="pb-2 font-medium">Response (hrs)</th>
            <th className="pb-2 font-medium">Resolve (hrs)</th>
          </tr>
        </thead>
        <tbody>
          {CRITICALITIES.map((c) => (
            <tr key={c} className="border-t border-border">
              <td className="py-2 text-text-2">{CRITICALITY_LABEL[c]}</td>
              <td className="py-2">
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  className={inputClass}
                  defaultValue={hoursFromMins(rows[c].response_mins)}
                  onBlur={(e) => void save(c, "response_mins", Number(e.target.value))}
                />
              </td>
              <td className="py-2">
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  className={inputClass}
                  defaultValue={hoursFromMins(rows[c].resolve_mins)}
                  onBlur={(e) => void save(c, "resolve_mins", Number(e.target.value))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

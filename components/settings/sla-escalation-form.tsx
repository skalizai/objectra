"use client";

import { useState } from "react";
import { IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { upsertSlaEscalationTier, addEscalationRecipient, removeEscalationRecipient } from "@/lib/actions/support-settings";
import type { SlaEscalationTierName } from "@/lib/types/database";
import type { EscalationRecipientWithName, SlaEscalationTierWithRecipients } from "@/lib/data/support";

const TIERS: SlaEscalationTierName[] = ["SL1", "SL2", "SL3"];
const inputClass =
  "h-8 w-16 rounded-[7px] border border-border-2 bg-surface-2 px-2 text-xs text-text focus:border-brass focus-visible:outline-none";
const selectClass =
  "h-8 rounded-[7px] border border-border-2 bg-surface-2 px-2 text-xs text-text-2 focus:border-brass focus-visible:outline-none";

function hoursFromMins(mins: number) {
  return Math.round((mins / 60) * 10) / 10;
}

type TierState = { id: string | null; thresholdHours: number; recipients: EscalationRecipientWithName[] };
type ConsultantOption = { id: string; full_name: string; email: string };

export function SlaEscalationForm({
  projectId,
  tiers,
  consultantOptions,
}: {
  projectId: string;
  tiers: SlaEscalationTierWithRecipients[];
  consultantOptions: ConsultantOption[];
}) {
  const [rows, setRows] = useState<Record<SlaEscalationTierName, TierState>>(() => {
    const byTier = Object.fromEntries(tiers.map((t) => [t.tier, t])) as Partial<
      Record<SlaEscalationTierName, SlaEscalationTierWithRecipients>
    >;
    return Object.fromEntries(
      TIERS.map((t) => [
        t,
        {
          id: byTier[t]?.id ?? null,
          thresholdHours: byTier[t] ? hoursFromMins(byTier[t]!.threshold_mins) : 0,
          recipients: byTier[t]?.recipients ?? [],
        },
      ]),
    ) as Record<SlaEscalationTierName, TierState>;
  });
  const [pendingResource, setPendingResource] = useState<Record<SlaEscalationTierName, string>>({
    SL1: "",
    SL2: "",
    SL3: "",
  });

  async function saveThreshold(tier: SlaEscalationTierName, hours: number) {
    if (!hours || hours <= 0) return;
    const mins = Math.round(hours * 60);
    const result = await upsertSlaEscalationTier(projectId, tier, mins);
    setRows((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], thresholdHours: hours, id: result.tierId ?? prev[tier].id },
    }));
  }

  async function addRecipient(tier: SlaEscalationTierName) {
    const tierId = rows[tier].id;
    const resourceId = pendingResource[tier];
    const resource = consultantOptions.find((c) => c.id === resourceId);
    if (!tierId || !resource) return;

    setRows((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        recipients: [
          ...prev[tier].recipients,
          { id: `pending-${resource.id}`, resource_id: resource.id, full_name: resource.full_name, email: resource.email },
        ],
      },
    }));
    setPendingResource((prev) => ({ ...prev, [tier]: "" }));
    await addEscalationRecipient(tierId, resourceId);
  }

  async function removeRecipient(tier: SlaEscalationTierName, recipientId: string) {
    setRows((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], recipients: prev[tier].recipients.filter((r) => r.id !== recipientId) },
    }));
    await removeEscalationRecipient(recipientId);
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <h3 className="font-display text-sm font-semibold">SLA escalation</h3>
      <p className="mt-1 text-xs text-text-3">
        If a ticket is still open past a tier&apos;s threshold, everyone on that tier&apos;s list gets emailed — SL1
        first, then SL2, then SL3 the longer it stays unresolved. Independent of the per-criticality SLA policy
        above.
      </p>

      <div className="mt-4 space-y-3">
        {TIERS.map((tier) => {
          const row = rows[tier];
          return (
            <div key={tier} className="rounded-control border border-border-2 bg-surface p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-text">{tier}</span>
                <label className="flex items-center gap-1.5 text-xs text-text-3">
                  Escalate after
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    className={inputClass}
                    defaultValue={row.thresholdHours || ""}
                    placeholder="hrs"
                    onBlur={(e) => void saveThreshold(tier, Number(e.target.value))}
                  />
                  hrs unresolved
                </label>
              </div>

              {row.id ? (
                <div className="mt-2.5 space-y-1.5">
                  {row.recipients.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 text-xs text-text-2">
                      <span>
                        {r.full_name}
                        {r.email ? ` — ${r.email}` : ""}
                      </span>
                      <button
                        onClick={() => removeRecipient(tier, r.id)}
                        className="text-text-3 hover:text-status-overdue"
                        aria-label="Remove recipient"
                      >
                        <IconX size={12} />
                      </button>
                    </div>
                  ))}
                  {row.recipients.length === 0 && (
                    <p className="text-xs text-text-3">No recipients yet — this tier won&apos;t email anyone.</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <select
                      className={selectClass}
                      value={pendingResource[tier]}
                      onChange={(e) => setPendingResource((prev) => ({ ...prev, [tier]: e.target.value }))}
                    >
                      <option value="">Add recipient…</option>
                      {consultantOptions.map((c) => (
                        <option key={c.id} value={c.id}>{c.full_name}</option>
                      ))}
                    </select>
                    <Button size="sm" variant="outline" onClick={() => addRecipient(tier)} disabled={!pendingResource[tier]}>
                      Add
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-text-3">Set a threshold above to enable recipients for this tier.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

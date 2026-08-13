"use client";

import { useState } from "react";
import { updateProjectPhase } from "@/lib/actions/support-settings";
import type { ProjectPhase } from "@/lib/types/database";

const selectClass =
  "h-9 rounded-control border border-border-2 bg-surface-2 px-2.5 text-sm text-text focus:border-brass focus-visible:outline-none";
const inputClass =
  "h-9 rounded-control border border-border-2 bg-surface-2 px-2.5 text-sm text-text focus:border-brass focus-visible:outline-none";

const PHASE_LABEL: Record<ProjectPhase, string> = {
  implementation: "Implementation",
  hypercare: "Hypercare",
  support: "Support",
};

export function ProjectPhaseToggle({
  projectId,
  phase,
  goLiveDate,
}: {
  projectId: string;
  phase: ProjectPhase;
  goLiveDate: string | null;
}) {
  const [localPhase, setLocalPhase] = useState(phase);
  const [localGoLive, setLocalGoLive] = useState(goLiveDate ?? "");
  const [saving, setSaving] = useState(false);

  async function save(nextPhase: ProjectPhase, nextGoLive: string) {
    setSaving(true);
    await updateProjectPhase(projectId, nextPhase, nextGoLive || null);
    setSaving(false);
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <h3 className="font-display text-sm font-semibold">Project phase</h3>
      <p className="mt-1 text-xs text-text-3">
        Tickets can only be raised while the project is in Hypercare or Support. The Support tab shows to everyone
        once you flip this.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-text-3">Phase</label>
          <select
            className={selectClass}
            value={localPhase}
            onChange={(e) => {
              const next = e.target.value as ProjectPhase;
              setLocalPhase(next);
              void save(next, localGoLive);
            }}
          >
            {(Object.keys(PHASE_LABEL) as ProjectPhase[]).map((p) => (
              <option key={p} value={p}>{PHASE_LABEL[p]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-3">Go-live date</label>
          <input
            type="date"
            className={inputClass}
            value={localGoLive}
            onChange={(e) => setLocalGoLive(e.target.value)}
            onBlur={(e) => void save(localPhase, e.target.value)}
          />
        </div>
        {saving && <span className="pb-2 text-xs text-text-3">Saving…</span>}
      </div>
    </div>
  );
}

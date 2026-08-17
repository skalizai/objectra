"use client";

import { useState } from "react";
import { upsertBacklogRateSettings } from "@/lib/actions/backlog-settings";
import type { BacklogRateSettings } from "@/lib/types/database";

const inputClass =
  "h-8 w-20 rounded-[7px] border border-border-2 bg-surface-2 px-2 text-xs text-text focus:border-brass focus-visible:outline-none";

type Field = keyof Omit<BacklogRateSettings, "id" | "project_id" | "created_at" | "updated_at">;

const FIELDS: { field: Field; label: string; step: number }[] = [
  { field: "tech_rate", label: "Technical rate ($/hr)", step: 1 },
  { field: "func_rate", label: "Functional rate ($/hr)", step: 1 },
  { field: "fiori_rate", label: "Fiori rate ($/hr)", step: 1 },
  { field: "pmo_rate", label: "PMO rate ($/hr)", step: 1 },
  { field: "hours_per_day", label: "Hours per day", step: 1 },
  { field: "monthly_hours", label: "Monthly hours", step: 1 },
  { field: "pmo_half_time_factor", label: "PMO half-time factor", step: 0.1 },
  { field: "project_months", label: "Project months", step: 0.5 },
  { field: "pgls_months", label: "PGLS months", step: 0.5 },
];

export function BacklogRateSettingsForm({ projectId, rates }: { projectId: string; rates: BacklogRateSettings }) {
  const [values, setValues] = useState(rates);

  async function save(field: Field, value: number) {
    setValues((prev) => ({ ...prev, [field]: value }));
    await upsertBacklogRateSettings(projectId, field, value);
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <h3 className="font-display text-sm font-semibold">Backlog rate card</h3>
      <p className="mt-1 text-xs text-text-3">
        Drives every Dev/Fiori/Functional/PMO/PGLS cost figure on this project&apos;s Backlog tab.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {FIELDS.map(({ field, label, step }) => (
          <div key={field}>
            <label className="block text-xs text-text-3">{label}</label>
            <input
              type="number"
              min={0}
              step={step}
              className={`${inputClass} mt-1 w-full`}
              defaultValue={values[field]}
              onBlur={(e) => void save(field, Number(e.target.value))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

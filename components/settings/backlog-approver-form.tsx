"use client";

import { useState } from "react";
import { updateBacklogApprover } from "@/lib/actions/backlog-settings";

type ResourceOption = { id: string; full_name: string };

export function BacklogApproverForm({
  projectId,
  approverId,
  consultantOptions,
}: {
  projectId: string;
  approverId: string | null;
  consultantOptions: ResourceOption[];
}) {
  const [value, setValue] = useState(approverId ?? "");
  const [saving, setSaving] = useState(false);

  async function save(next: string) {
    setValue(next);
    setSaving(true);
    await updateBacklogApprover(projectId, next || null);
    setSaving(false);
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <h3 className="font-display text-sm font-semibold">Backlog approver</h3>
      <p className="mt-1 text-xs text-text-3">
        Who gets notified when a PM sends backlog items for approval. Leave unset to default to the project&apos;s PM.
        {saving && <span className="text-brass"> Saving…</span>}
      </p>
      <select
        value={value}
        onChange={(e) => void save(e.target.value)}
        className="mt-3 h-9 w-full max-w-xs rounded-control border border-border-2 bg-surface-2 px-2.5 text-sm text-text focus:border-brass focus-visible:outline-none"
      >
        <option value="">Default to project PM</option>
        {consultantOptions.map((c) => (
          <option key={c.id} value={c.id}>{c.full_name}</option>
        ))}
      </select>
    </div>
  );
}

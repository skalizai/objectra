"use client";

import { useState } from "react";
import { IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { addObjectStatusEmailRecipient, removeObjectStatusEmailRecipient } from "@/lib/actions/objects";
import type { ObjectStatusEmailRecipientWithName } from "@/lib/data/objects";

const selectClass =
  "h-8 rounded-[7px] border border-border-2 bg-surface-2 px-2 text-xs text-text-2 focus:border-brass focus-visible:outline-none";

type ConsultantOption = { id: string; full_name: string };

export function ObjectStatusEmailForm({
  projectId,
  pmName,
  recipients,
  consultantOptions,
}: {
  projectId: string;
  pmName: string | null;
  recipients: ObjectStatusEmailRecipientWithName[];
  consultantOptions: ConsultantOption[];
}) {
  const [rows, setRows] = useState(recipients);
  const [pending, setPending] = useState("");

  async function addRecipient() {
    const resource = consultantOptions.find((c) => c.id === pending);
    if (!resource) return;

    setRows((prev) => [
      ...prev,
      { id: `pending-${resource.id}`, resource_id: resource.id, full_name: resource.full_name, email: "" },
    ]);
    setPending("");
    await addObjectStatusEmailRecipient(projectId, resource.id);
  }

  async function removeRecipient(recipientId: string) {
    setRows((prev) => prev.filter((r) => r.id !== recipientId));
    await removeObjectStatusEmailRecipient(recipientId);
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <h3 className="font-display text-sm font-semibold">Object status emails</h3>
      <p className="mt-1 text-xs text-text-3">
        When an object moves to a status flagged for email (Settings → Object statuses), the assigned consultants are
        notified and {pmName ? <>this project&apos;s PM (<strong className="text-text-2">{pmName}</strong>)</> : "this project's PM"} is
        always CC&apos;d. Add anyone else — PMO, other stakeholders — below; no invite required.
      </p>

      <div className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 text-xs text-text-2">
            <span>{r.full_name}</span>
            <button onClick={() => removeRecipient(r.id)} className="text-text-3 hover:text-status-overdue" aria-label="Remove recipient">
              <IconX size={12} />
            </button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-text-3">No extra recipients yet.</p>}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <select className={selectClass} value={pending} onChange={(e) => setPending(e.target.value)}>
          <option value="">Add recipient…</option>
          {consultantOptions
            .filter((c) => !rows.some((r) => r.resource_id === c.id))
            .map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
        </select>
        <Button size="sm" variant="outline" onClick={addRecipient} disabled={!pending}>
          Add
        </Button>
      </div>
    </div>
  );
}

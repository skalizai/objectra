"use client";

import { useState } from "react";
import { IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { upsertSupportRouting, deleteSupportRouting } from "@/lib/actions/support-settings";
import type { SupportRouting } from "@/lib/types/database";

const selectClass =
  "h-8 rounded-[7px] border border-border-2 bg-surface-2 px-2 text-xs text-text-2 focus:border-brass focus-visible:outline-none";

type ConsultantOption = { id: string; full_name: string; primary_module: string | null };

export function SupportRoutingForm({
  projectId,
  routing,
  modules,
  consultantOptions,
}: {
  projectId: string;
  routing: SupportRouting[];
  modules: string[];
  consultantOptions: ConsultantOption[];
}) {
  const [rows, setRows] = useState(routing);
  const [newModule, setNewModule] = useState("");
  const [newPrimary, setNewPrimary] = useState("");
  const [newBackup, setNewBackup] = useState("");

  async function addRow() {
    if (!newModule || !newPrimary) return;
    await upsertSupportRouting(projectId, newModule, newPrimary, newBackup || null, true);
    setRows((prev) => [
      ...prev.filter((r) => r.module !== newModule),
      {
        id: `pending-${newModule}`,
        project_id: projectId,
        module: newModule,
        primary_consultant_id: newPrimary,
        backup_consultant_id: newBackup || null,
        is_active: true,
        created_at: "",
        updated_at: "",
      },
    ]);
    setNewModule("");
    setNewPrimary("");
    setNewBackup("");
  }

  async function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    await deleteSupportRouting(id);
  }

  function name(id: string | null) {
    return consultantOptions.find((c) => c.id === id)?.full_name ?? "—";
  }

  // Every active project member is always selectable — primary_module
  // tagging (Settings → Resources) can be missing or point at a
  // disconnected roster row, and a hard filter on it turns that into a
  // dead-end empty dropdown. Instead, sort whoever matches the chosen
  // module to the top and label their tag, so the right pick is easy to
  // find without ever blocking on imperfect tagging.
  const sortedConsultants = [...consultantOptions].sort((a, b) => {
    if (!newModule) return a.full_name.localeCompare(b.full_name);
    const aMatch = (a.primary_module ?? "").trim().toLowerCase() === newModule.trim().toLowerCase();
    const bMatch = (b.primary_module ?? "").trim().toLowerCase() === newModule.trim().toLowerCase();
    if (aMatch !== bMatch) return aMatch ? -1 : 1;
    return a.full_name.localeCompare(b.full_name);
  });

  function consultantLabel(c: ConsultantOption) {
    return c.primary_module ? `${c.full_name} — ${c.primary_module}` : c.full_name;
  }

  function handleModuleChange(module: string) {
    setNewModule(module);
    setNewPrimary("");
    setNewBackup("");
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <h3 className="font-display text-sm font-semibold">Ticket routing</h3>
      <p className="mt-1 text-xs text-text-3">
        A ticket raised for a module auto-assigns to the primary consultant (backup if primary is unavailable). No
        rule for a module leaves the ticket unrouted, assigned to the PM.
      </p>

      <ul className="mt-4 divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
            <span className="w-20 shrink-0 font-mono text-xs text-text">{r.module}</span>
            <span className="flex-1 text-xs text-text-2">
              {name(r.primary_consultant_id)}
              {r.backup_consultant_id && <> · backup: {name(r.backup_consultant_id)}</>}
            </span>
            <button onClick={() => removeRow(r.id)} className="text-text-3 hover:text-status-overdue" aria-label="Remove">
              <IconTrash size={14} />
            </button>
          </li>
        ))}
        {rows.length === 0 && <li className="py-3 text-xs text-text-3">No routing rules yet — every ticket lands on the PM.</li>}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select className={selectClass} value={newModule} onChange={(e) => handleModuleChange(e.target.value)}>
          <option value="">Module…</option>
          {modules.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className={selectClass} value={newPrimary} onChange={(e) => setNewPrimary(e.target.value)} disabled={!newModule}>
          <option value="">{newModule ? "Primary…" : "Pick a module first"}</option>
          {sortedConsultants.map((c) => <option key={c.id} value={c.id}>{consultantLabel(c)}</option>)}
        </select>
        <select className={selectClass} value={newBackup} onChange={(e) => setNewBackup(e.target.value)} disabled={!newModule}>
          <option value="">{newModule ? "Backup (optional)…" : "Pick a module first"}</option>
          {sortedConsultants.map((c) => <option key={c.id} value={c.id}>{consultantLabel(c)}</option>)}
        </select>
        <Button size="sm" variant="outline" onClick={addRow} disabled={!newModule || !newPrimary}>
          Add rule
        </Button>
      </div>
      {newModule && !sortedConsultants.some((c) => (c.primary_module ?? "").trim().toLowerCase() === newModule.trim().toLowerCase()) && (
        <p className="mt-2 text-xs text-text-3">
          Nobody on this project is tagged with primary module &quot;{newModule}&quot; in Resources — everyone&apos;s
          still listed below, pick manually.
        </p>
      )}
    </div>
  );
}

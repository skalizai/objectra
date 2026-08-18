"use client";

import { useState } from "react";
import { format } from "date-fns";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import type { BacklogApprovalAction, BacklogApprovalLogEntry } from "@/lib/types/database";

const ACTION_LABEL: Record<BacklogApprovalAction, string> = {
  sent: "Sent",
  approved: "Approved",
  rejected: "Rejected",
  on_hold: "On hold",
};
const ACTION_COLOR: Record<BacklogApprovalAction, string> = {
  sent: "#E0A340",
  approved: "#35C08A",
  rejected: "#F0574B",
  on_hold: "#9A7CF7",
};

/** Read-only, append-only audit trail (backlog_approval_log has no
 * UPDATE/DELETE RLS policy at all) -- every send/decision, newest first.
 * Collapsed by default since most day-to-day use is the register above it. */
export function BacklogApprovalLog({ entries }: { entries: BacklogApprovalLogEntry[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-card border border-border bg-surface" style={{ boxShadow: "var(--shadow-card)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-5 py-3.5 text-left"
      >
        {open ? <IconChevronDown size={16} className="text-text-3" /> : <IconChevronRight size={16} className="text-text-3" />}
        <h3 className="font-display text-sm font-semibold text-text">Approval log</h3>
        <span className="text-xs text-text-3">{entries.length} event{entries.length === 1 ? "" : "s"}</span>
      </button>

      {open && (
        <div className="scroll-x-top overflow-x-auto border-t border-border">
          {entries.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-text-3">No approval activity yet.</p>
          ) : (
            <table className="w-full min-w-[800px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-left text-xs text-text-3">
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Ref</th>
                  <th className="px-4 py-2.5 font-medium">Items</th>
                  <th className="px-4 py-2.5 font-medium">Action</th>
                  <th className="px-4 py-2.5 font-medium">Total days</th>
                  <th className="px-4 py-2.5 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs text-text-2">
                      {format(new Date(entry.created_at), "dd MMM yyyy, h:mm a")}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-text-2">{entry.batch_ref || "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-text-2">{entry.item_ids.length}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
                        style={{ borderColor: ACTION_COLOR[entry.action], color: ACTION_COLOR[entry.action], borderWidth: 1.5 }}
                      >
                        {ACTION_LABEL[entry.action]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-text-2">{entry.total_days?.toFixed(1) ?? "—"}</td>
                    <td className="px-4 py-2.5 text-text-2">{entry.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

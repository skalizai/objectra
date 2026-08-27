"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { IconSearch } from "@tabler/icons-react";
import { TicketGlyph } from "@/components/support/ticket-glyph";
import { CriticalityPill } from "@/components/support/criticality-pill";
import { TicketDetailDrawer } from "@/components/support/ticket-detail-drawer";
import type { TicketWithNames } from "@/lib/data/support";
import type { TicketCriticality, TicketStatus } from "@/lib/types/database";

const STATUS_LABEL: Record<TicketStatus, string> = {
  new: "New",
  assigned: "Assigned",
  in_progress: "In progress",
  pending_user: "Pending your input",
  resolved: "Resolved",
  closed: "Closed",
  reopened: "Reopened",
};

const selectClass =
  "h-9 rounded-control border border-border-2 bg-surface-2 px-2.5 text-sm text-text-2 focus:border-brass focus-visible:outline-none";

export function TicketsTable({
  projectId,
  tickets,
  viewerId,
  canManage,
  consultantOptions,
}: {
  projectId: string;
  tickets: TicketWithNames[];
  viewerId: string;
  canManage: boolean;
  consultantOptions: { id: string; full_name: string; profile_id: string | null }[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [criticalityFilter, setCriticalityFilter] = useState<TicketCriticality | "all">("all");
  const [selected, setSelected] = useState<TicketWithNames | null>(null);

  // Copied into local state so a delete can remove the row immediately —
  // resynced whenever the parent re-renders with a genuinely new list, same
  // pattern as ResourcesTable.
  const [rows, setRows] = useState(tickets);
  const [prevTickets, setPrevTickets] = useState(tickets);
  if (tickets !== prevTickets) {
    setPrevTickets(tickets);
    setRows(tickets);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((t) => {
      if (q && !`${t.subject} ${t.ticket_no ?? ""} ${t.module}`.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (criticalityFilter !== "all" && t.criticality !== criticalityFilter) return false;
      return true;
    });
  }, [rows, search, statusFilter, criticalityFilter]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 pb-4">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject, ticket #, or module…"
            className="h-9 w-full rounded-control border border-border-2 bg-surface-2 pl-9 pr-3 text-sm text-text placeholder:text-text-3 focus:border-brass focus-visible:outline-none"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "all")} className={selectClass}>
          <option value="all">All statuses</option>
          {(Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select value={criticalityFilter} onChange={(e) => setCriticalityFilter(e.target.value as TicketCriticality | "all")} className={selectClass}>
          <option value="all">All criticalities</option>
          {(["P1_critical", "P2_high", "P3_medium", "P4_low"] as TicketCriticality[]).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="scroll-x-top overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-xs text-text-3">
              <th className="px-4 py-2.5 font-medium">Ticket #</th>
              <th className="px-4 py-2.5 font-medium">Subject</th>
              <th className="px-4 py-2.5 font-medium">Criticality</th>
              <th className="px-4 py-2.5 font-medium">Assigned to</th>
              <th className="px-4 py-2.5 font-medium">Raised by</th>
              <th className="px-4 py-2.5 font-medium">SLA due</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <motion.tr
                key={t.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.4) }}
                onClick={() => setSelected(t)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-2"
              >
                <td className="px-4 py-2.5 font-mono text-xs text-text-2">{t.ticket_no || "—"}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <TicketGlyph module={t.module} size={22} />
                    <span className="min-w-0 truncate text-text">{t.subject}</span>
                    {t.source === "teams" && (
                      <span className="shrink-0 rounded-[6px] bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-text-2">
                        Teams
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5"><CriticalityPill criticality={t.criticality} /></td>
                <td className="px-4 py-2.5 text-text-2">{t.assigned_to_name ?? "Unrouted"}</td>
                <td className="px-4 py-2.5 text-text-2">{t.raised_by_name ?? "—"}</td>
                <td className="px-4 py-2.5 font-mono text-xs" style={{ color: t.sla_breached ? "var(--status-overdue)" : undefined }}>
                  {t.sla_due_at ? format(new Date(t.sla_due_at), "dd MMM, h:mm a") : "—"}
                </td>
                <td className="px-4 py-2.5 text-text-2">{STATUS_LABEL[t.status]}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && <p className="py-12 text-center text-sm text-text-3">No tickets match these filters.</p>}
      </div>

      <TicketDetailDrawer
        ticket={selected}
        projectId={projectId}
        viewerId={viewerId}
        canManage={canManage}
        consultantOptions={consultantOptions}
        onClose={() => setSelected(null)}
        onDeleted={() => setRows((prev) => prev.filter((t) => t.id !== selected?.id))}
      />
    </div>
  );
}

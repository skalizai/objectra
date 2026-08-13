"use client";

import { useState } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { TicketGlyph } from "@/components/support/ticket-glyph";
import { CriticalityPill } from "@/components/support/criticality-pill";
import { TicketDetailDrawer } from "@/components/support/ticket-detail-drawer";
import type { TicketWithNames } from "@/lib/data/support";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  assigned: "Assigned",
  in_progress: "In progress",
  pending_user: "Pending your input",
  resolved: "Resolved",
  closed: "Closed",
  reopened: "Reopened",
};

export function MyTicketsList({ tickets, viewerId }: { tickets: TicketWithNames[]; viewerId: string }) {
  const [selected, setSelected] = useState<TicketWithNames | null>(null);

  if (tickets.length === 0) {
    return <p className="py-6 text-sm text-text-3">No tickets right now.</p>;
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tickets.map((t, i) => (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.4) }}
            onClick={() => setSelected(t)}
            className="rounded-card border border-border bg-surface p-4 text-left hover:border-border-2"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TicketGlyph module={t.module} size={20} />
                <span className="font-mono text-xs text-text-3">{t.ticket_no ?? "—"}</span>
              </div>
              <CriticalityPill criticality={t.criticality} />
            </div>
            <div className="mt-2 truncate text-sm font-medium text-text">{t.subject}</div>
            <div className="mt-1 flex items-center justify-between text-xs text-text-3">
              <span>{STATUS_LABEL[t.status] ?? t.status}</span>
              <span style={{ color: t.sla_breached ? "var(--status-overdue)" : undefined }}>
                {t.sla_due_at ? format(new Date(t.sla_due_at), "MMM d, h:mm a") : ""}
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      <TicketDetailDrawer
        ticket={selected}
        projectId={selected?.project_id ?? ""}
        viewerId={viewerId}
        canManage={false}
        consultantOptions={[]}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

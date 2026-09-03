"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Drawer } from "@/components/ui/drawer";
import { Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CriticalityPill } from "@/components/support/criticality-pill";
import { TicketGlyph } from "@/components/support/ticket-glyph";
import { DeleteTicketButton } from "@/components/support/delete-ticket-button";
import {
  addTicketComment,
  consultantUpdateTicket,
  managerUpdateTicket,
  raiserCloseOrReopenTicket,
  reassignTicket,
  updateTicketCriticality,
  loadTicketDetail,
} from "@/lib/actions/tickets";
import type { TicketCommentWithAuthor, TicketEventWithActor, TicketWithNames } from "@/lib/data/support";
import type { TicketCriticality, TicketStatus } from "@/lib/types/database";

const selectClass =
  "h-9 w-full rounded-control border border-border-2 bg-surface-2 px-2.5 text-sm text-text focus:border-brass focus-visible:outline-none";

const STATUS_LABEL: Record<TicketStatus, string> = {
  new: "New",
  assigned: "Assigned",
  in_progress: "In progress",
  pending_user: "Pending your input",
  resolved: "Resolved",
  closed: "Closed",
  reopened: "Reopened",
};

const CONSULTANT_STATUSES: TicketStatus[] = ["assigned", "in_progress", "pending_user", "resolved"];

function TicketDetailBody({
  ticket,
  projectId,
  viewerId,
  canManage,
  consultantOptions,
  onDeleted,
}: {
  ticket: TicketWithNames;
  projectId: string;
  viewerId: string;
  canManage: boolean;
  consultantOptions: { id: string; full_name: string; profile_id: string | null }[];
  onDeleted: () => void;
}) {
  const [comments, setComments] = useState<TicketCommentWithAuthor[]>([]);
  const [events, setEvents] = useState<TicketEventWithActor[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [reopenComment, setReopenComment] = useState("");
  const [pending, setPending] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);

  // The reassign picker offers every resource (invited or not — section
  // 24). assigned_to_resource_id (0047) is the direct, always-populated
  // record of who's picked; fall back to matching assigned_to by
  // profile_id for tickets routed before that column existed.
  const currentResourceId =
    ticket.assigned_to_resource_id ?? consultantOptions.find((c) => c.profile_id === ticket.assigned_to)?.id ?? "";

  const isAssignee = ticket.assigned_to === viewerId;
  const isRaiser = ticket.raised_by === viewerId;
  const canSeeInternal = canManage || isAssignee;

  useEffect(() => {
    let cancelled = false;
    loadTicketDetail(ticket.id).then((r) => {
      if (!cancelled) {
        setComments(r.comments);
        setEvents(r.events);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ticket.id]);

  async function submitComment() {
    if (!commentBody.trim()) return;
    setPending(true);
    const formData = new FormData();
    formData.set("body", commentBody);
    await addTicketComment(ticket.id, isInternal, { error: null, success: false }, formData);
    const fresh = await loadTicketDetail(ticket.id);
    setComments(fresh.comments);
    setCommentBody("");
    setPending(false);
  }

  async function handleConsultantStatus(status: TicketStatus) {
    setPending(true);
    if (isAssignee) await consultantUpdateTicket(ticket.id, { status });
    else await managerUpdateTicket(ticket.id, projectId, { status });
    setPending(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <TicketGlyph module={ticket.module} size={28} />
        <div>
          <div className="text-sm text-text">{ticket.module}</div>
          <div className="font-mono text-xs text-text-3">{ticket.ticket_no ?? "Generating…"}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {ticket.source === "teams" && (
            <span className="rounded-[6px] bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-text-2">
              Teams
            </span>
          )}
          <CriticalityPill criticality={ticket.criticality} />
        </div>
      </div>
      {ticket.source === "teams" && ticket.source_message_link && (
        <a
          href={ticket.source_message_link}
          target="_blank"
          rel="noreferrer"
          className="-mt-3 block text-xs text-text-3 hover:text-brass"
        >
          View original message →
        </a>
      )}

      <div>
        <Label>Description</Label>
        <p className="whitespace-pre-wrap text-sm text-text-2">{ticket.description || "—"}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <Label>Status</Label>
          <p className="text-text-2">{STATUS_LABEL[ticket.status]}</p>
        </div>
        <div>
          <Label>SLA due</Label>
          <p className="text-text-2" style={{ color: ticket.sla_breached ? "var(--status-overdue)" : undefined }}>
            {ticket.sla_due_at ? format(new Date(ticket.sla_due_at), "MMM d, h:mm a") : "—"}
          </p>
        </div>
        <div>
          <Label>Raised by</Label>
          <p className="text-text-2">{ticket.raised_by_name ?? "—"}</p>
        </div>
        <div>
          <Label>Assigned to</Label>
          <p className="text-text-2">
            {ticket.assigned_to_name ??
              (ticket.assigned_to_resource_name ? `${ticket.assigned_to_resource_name} (not yet invited)` : "Unrouted")}
          </p>
        </div>
        {ticket.reported_by_resource_name && (
          <div>
            <Label>Issue reported by</Label>
            <p className="text-text-2">{ticket.reported_by_resource_name}</p>
          </div>
        )}
      </div>

      {canManage && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Reassign</Label>
            <select
              className={selectClass}
              defaultValue={currentResourceId}
              onChange={async (e) => {
                if (!e.target.value) return;
                setReassignError(null);
                const result = await reassignTicket(ticket.id, projectId, e.target.value);
                if (result.error) setReassignError(result.error);
              }}
            >
              <option value="">Unassigned</option>
              {consultantOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
            {reassignError && (
              <p className="mt-1 text-xs" style={{ color: "var(--status-overdue)" }}>{reassignError}</p>
            )}
          </div>
          <div>
            <Label>Criticality</Label>
            <select
              className={selectClass}
              defaultValue={ticket.criticality}
              onChange={(e) => void updateTicketCriticality(ticket.id, projectId, e.target.value as TicketCriticality)}
            >
              {(["P1_critical", "P2_high", "P3_medium", "P4_low"] as TicketCriticality[]).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {(isAssignee || canManage) && !["resolved", "closed"].includes(ticket.status) && (
        <div>
          <Label>Move to</Label>
          <div className="flex flex-wrap gap-2">
            {CONSULTANT_STATUSES.filter((s) => s !== ticket.status).map((s) => (
              <Button key={s} size="sm" variant="outline" disabled={pending} onClick={() => handleConsultantStatus(s)}>
                {STATUS_LABEL[s]}
              </Button>
            ))}
          </div>
        </div>
      )}

      {isRaiser && ticket.status === "resolved" && (
        <div className="space-y-2 rounded-control border border-border-2 bg-surface-2 p-3">
          <Label>Fixed?</Label>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={pending} onClick={() => raiserCloseOrReopenTicket(ticket.id, "close")}>
              Accept fix
            </Button>
          </div>
          <textarea
            value={reopenComment}
            onChange={(e) => setReopenComment(e.target.value)}
            placeholder="Explain why this isn't fixed…"
            rows={2}
            className="w-full resize-none rounded-control border border-border-2 bg-surface px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-brass focus-visible:outline-none"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={pending || !reopenComment.trim()}
            onClick={async () => {
              setPending(true);
              await raiserCloseOrReopenTicket(ticket.id, "reopen", reopenComment);
              setReopenComment("");
              setPending(false);
            }}
          >
            Reopen
          </Button>
        </div>
      )}

      <div>
        <Label>Activity</Label>
        <ul className="space-y-1.5 text-xs text-text-3">
          {events.map((e) => (
            <li key={e.id}>
              {format(new Date(e.occurred_at), "MMM d, h:mm a")} — {e.event.replace(/_/g, " ")}
              {e.actor_name ? ` by ${e.actor_name}` : ""}
              {e.old_value && e.new_value ? `: ${e.old_value} → ${e.new_value}` : ""}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <Label>Comments</Label>
        <ul className="space-y-2">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-control border p-2.5 text-sm"
              style={{
                borderColor: c.is_internal ? "var(--brass)" : "var(--border-2)",
                background: c.is_internal ? "var(--surface-2)" : "transparent",
              }}
            >
              <div className="flex items-center gap-2 text-xs text-text-3">
                <span>{c.author_name ?? "—"}</span>
                <span>{format(new Date(c.created_at), "MMM d, h:mm a")}</span>
                {c.is_internal && (
                  <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ color: "var(--brass)" }}>
                    Internal
                  </span>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-text-2">{c.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-2 space-y-1.5">
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            rows={2}
            placeholder="Add a comment…"
            className="w-full resize-none rounded-control border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-brass focus-visible:outline-none"
          />
          <div className="flex items-center justify-between">
            {canSeeInternal ? (
              <label className="flex items-center gap-2 text-xs text-text-2">
                <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                Internal note (hidden from raiser)
              </label>
            ) : (
              <span />
            )}
            <Button size="sm" disabled={pending || !commentBody.trim()} onClick={submitComment}>
              Post
            </Button>
          </div>
        </div>
      </div>

      {canManage && (
        <div className="border-t border-border pt-4">
          <DeleteTicketButton ticketId={ticket.id} ticketNo={ticket.ticket_no ?? ticket.subject} projectId={projectId} onDeleted={onDeleted} />
        </div>
      )}
    </div>
  );
}

export function TicketDetailDrawer({
  ticket,
  projectId,
  viewerId,
  canManage,
  consultantOptions,
  onClose,
  onDeleted,
}: {
  ticket: TicketWithNames | null;
  projectId: string;
  viewerId: string;
  canManage: boolean;
  consultantOptions: { id: string; full_name: string; profile_id: string | null }[];
  onClose: () => void;
  /** Called after a successful delete, in addition to onClose — lets the
   * parent (e.g. TicketsTable) drop the row from its own list. */
  onDeleted?: () => void;
}) {
  return (
    <Drawer open={!!ticket} onClose={onClose} title={ticket ? `${ticket.ticket_no ?? ""} — ${ticket.subject}` : ""} width={480}>
      {ticket && (
        <TicketDetailBody
          key={ticket.id}
          ticket={ticket}
          projectId={projectId}
          viewerId={viewerId}
          canManage={canManage}
          consultantOptions={consultantOptions}
          onDeleted={() => {
            onDeleted?.();
            onClose();
          }}
        />
      )}
    </Drawer>
  );
}

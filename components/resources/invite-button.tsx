"use client";

import { useActionState, useState } from "react";
import { IconAlertCircle, IconCircleCheck, IconMailFast } from "@tabler/icons-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { inviteResourceRecord } from "@/lib/actions/invitations";
import type { InviteResourceState } from "@/lib/actions/invitations";
import type { InvitationRole } from "@/lib/types/database";

const initialState: InviteResourceState = { error: null, success: false };
const selectClass =
  "h-10 w-full rounded-control border border-border-2 bg-surface-2 px-3 text-sm text-text focus:border-brass focus-visible:outline-none";

export function InviteButton({
  resourceId,
  resourceName,
  defaultAllocationPct,
  defaultRole = "member",
  projectOptions,
  resend = false,
}: {
  resourceId: string;
  resourceName: string;
  defaultAllocationPct: number;
  defaultRole?: InvitationRole;
  projectOptions: { id: string; name: string }[];
  /** True once already invited — same action, just resets their password
   * and re-sends rather than creating a fresh login. Safe to run as many
   * times as needed (lost email, adding to another project, etc). */
  resend?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const boundAction = inviteResourceRecord.bind(null, resourceId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <IconMailFast size={14} />
        {resend ? "Resend" : "Invite"}
      </Button>

      <Drawer open={open} onClose={() => setOpen(false)} title={`${resend ? "Resend login for" : "Invite"} ${resourceName}`}>
        <form action={formAction} className="space-y-4">
          <p className="text-xs text-text-3">
            {resend
              ? `Resets ${resourceName}'s password and emails the new one along with their sign-in email — use this if they lost it, or to add them to another project.`
              : `Creates a login and emails ${resourceName} their sign-in email and password directly — no separate "set a password" step. Once signed in, they'll see only their assigned objects/tickets, and can update status and add comments.`}
          </p>

          {state.error && (
            <div
              className="flex items-start gap-2 rounded-control border px-3 py-2.5 text-sm"
              style={{ borderColor: "var(--status-overdue)", color: "var(--status-overdue)" }}
            >
              <IconAlertCircle size={16} className="mt-0.5 shrink-0" />
              {state.error}
            </div>
          )}
          {state.success && (
            <div
              className="flex items-start gap-2 rounded-control border px-3 py-2.5 text-sm"
              style={{ borderColor: "var(--status-live)", color: "var(--status-live)" }}
            >
              <IconCircleCheck size={16} className="mt-0.5 shrink-0" />
              {resend ? "New login sent." : "Invite sent."}
            </div>
          )}

          <div>
            <Label htmlFor="project_id">Project</Label>
            <select id="project_id" name="project_id" required className={selectClass}>
              <option value="">Select a project…</option>
              {projectOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="role">Access level</Label>
              <select id="role" name="role" required className={selectClass} defaultValue={defaultRole}>
                <option value="project_manager">Project manager</option>
                <option value="technical_lead">Technical lead</option>
                <option value="pmo">PMO</option>
                {/* Functional/Technical Consultant both grant the same
                    underlying "member" access (assigned-work-only) — split
                    into two labels here just so the common case reads
                    clearly at invite time, without adding a real new
                    permission tier. */}
                <option value="member">Technical Consultant</option>
                <option value="member">Functional Consultant</option>
                <option value="client">Client</option>
                <option value="super_user">Super user</option>
              </select>
            </div>
            <div>
              <Label htmlFor="allocation_pct">Allocation %</Label>
              <select
                id="allocation_pct"
                name="allocation_pct"
                required
                className={selectClass}
                defaultValue={defaultAllocationPct}
              >
                <option value={25}>25%</option>
                <option value={50}>50%</option>
                <option value={75}>75%</option>
                <option value={100}>100%</option>
              </select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Sending…" : resend ? "Reset & resend login" : "Send invite"}
          </Button>
        </form>
      </Drawer>
    </>
  );
}

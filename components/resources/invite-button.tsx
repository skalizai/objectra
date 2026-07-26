"use client";

import { useActionState, useState } from "react";
import { IconAlertCircle, IconCircleCheck, IconMailFast } from "@tabler/icons-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { inviteResourceRecord } from "@/lib/actions/invitations";
import type { InviteResourceState } from "@/lib/actions/invitations";

const initialState: InviteResourceState = { error: null, success: false };
const selectClass =
  "h-10 w-full rounded-control border border-border-2 bg-surface-2 px-3 text-sm text-text focus:border-brass focus-visible:outline-none";

export function InviteButton({
  resourceId,
  resourceName,
  defaultAllocationPct,
  projectOptions,
}: {
  resourceId: string;
  resourceName: string;
  defaultAllocationPct: number;
  projectOptions: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const boundAction = inviteResourceRecord.bind(null, resourceId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <IconMailFast size={14} />
        Invite
      </Button>

      <Drawer open={open} onClose={() => setOpen(false)} title={`Invite ${resourceName}`}>
        <form action={formAction} className="space-y-4">
          <p className="text-xs text-text-3">
            Sends a login invite for this project. Once accepted, {resourceName} will see only their
            assigned objects and can update status against them.
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
              Invite sent.
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
              <select id="role" name="role" required className={selectClass} defaultValue="member">
                <option value="project_manager">Project manager</option>
                <option value="technical_lead">Technical lead</option>
                <option value="pmo">PMO</option>
                <option value="member">Member</option>
                <option value="client">Client</option>
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
            {pending ? "Sending invite…" : "Send invite"}
          </Button>
        </form>
      </Drawer>
    </>
  );
}

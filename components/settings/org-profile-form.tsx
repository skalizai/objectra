"use client";

import { useActionState } from "react";
import { IconAlertCircle, IconCircleCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { updateOrgProfile, type SimpleActionState } from "@/lib/actions/settings";

const initialState: SimpleActionState = { error: null, success: false };

export function OrgProfileForm({ orgName }: { orgName: string }) {
  const [state, formAction, pending] = useActionState(updateOrgProfile, initialState);

  return (
    <div className="rounded-card border border-border bg-surface p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <h3 className="font-display text-sm font-semibold">Organisation profile</h3>

      <form action={formAction} className="mt-4 space-y-4">
        {state.error && (
          <div className="flex items-start gap-2 rounded-control border px-3 py-2.5 text-sm" style={{ borderColor: "var(--status-overdue)", color: "var(--status-overdue)" }}>
            <IconAlertCircle size={16} className="mt-0.5 shrink-0" />
            {state.error}
          </div>
        )}
        {state.success && (
          <div className="flex items-start gap-2 rounded-control border px-3 py-2.5 text-sm" style={{ borderColor: "var(--status-live)", color: "var(--status-live)" }}>
            <IconCircleCheck size={16} className="mt-0.5 shrink-0" />
            Saved.
          </div>
        )}

        <div>
          <Label htmlFor="name">Organisation name</Label>
          <Input id="name" name="name" defaultValue={orgName} required />
        </div>

        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </form>
    </div>
  );
}

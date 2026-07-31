"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { IconAlertCircle, IconCircleCheck, IconUserPlus } from "@tabler/icons-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useModules, useProjectRoles } from "@/components/providers/picklist-provider";
import { addResource, type AddResourceState } from "@/lib/actions/resources";

const initialState: AddResourceState = { error: null, success: false };
const selectClass =
  "h-10 w-full rounded-control border border-border-2 bg-surface-2 px-3 text-sm text-text focus:border-brass focus-visible:outline-none";

export function AddResourceButton() {
  const modules = useModules();
  const projectRoles = useProjectRoles();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addResource, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      formRef.current?.reset();
      setOpen(false);
    }
    wasPending.current = pending;
  }, [pending, state.error]);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <IconUserPlus size={16} />
        Add resource
      </Button>

      <Drawer open={open} onClose={() => setOpen(false)} title="Add resource">
        <form ref={formRef} action={formAction} className="space-y-4">
          <p className="text-xs text-text-3">
            This just saves the resource to your roster — no login is created yet. Invite them to a
            project from the resources list whenever you&apos;re ready.
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
              Resource saved.
            </div>
          )}

          <div>
            <Label htmlFor="full_name">Resource name</Label>
            <Input id="full_name" name="full_name" required placeholder="Jordan Lee" />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="jordan@example.com" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="consultant_type">Functional, Technical or PMO</Label>
              <select id="consultant_type" name="consultant_type" className={selectClass} defaultValue="">
                <option value="">—</option>
                {projectRoles.map((r) => (
                  <option key={r.id} value={r.value}>{r.value}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="role_title">Role</Label>
              <Input id="role_title" name="role_title" placeholder="Senior Consultant" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="primary_module">Area</Label>
              <select id="primary_module" name="primary_module" className={selectClass} defaultValue="">
                <option value="">—</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.value}>{m.value}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="location">Onsite or offshore</Label>
              <select id="location" name="location" className={selectClass} defaultValue="">
                <option value="">—</option>
                <option value="onsite">Onsite</option>
                <option value="offshore">Offshore</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="allocation_pct">Allocation %</Label>
            <select id="allocation_pct" name="allocation_pct" className={selectClass} defaultValue="50">
              <option value="25">25%</option>
              <option value="50">50%</option>
              <option value="75">75%</option>
              <option value="100">100%</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-text-2">
            <input type="checkbox" name="email_notifications_enabled" defaultChecked />
            Email
          </label>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Save resource"}
          </Button>
        </form>
      </Drawer>
    </>
  );
}

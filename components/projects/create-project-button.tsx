"use client";

import { useActionState, useState } from "react";
import { IconAlertCircle, IconPlus } from "@tabler/icons-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useCompanyCodes, useStreams } from "@/components/providers/picklist-provider";
import { createProject, type CreateProjectState } from "@/lib/actions/projects";

const initialState: CreateProjectState = { error: null };
const selectClass =
  "h-10 w-full rounded-control border border-border-2 bg-surface-2 px-3 text-sm text-text focus:border-brass focus-visible:outline-none";

export function CreateProjectButton({
  pmOptions,
}: {
  pmOptions: { id: string; full_name: string }[];
}) {
  const companyCodes = useCompanyCodes();
  const streams = useStreams();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createProject, initialState);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <IconPlus size={16} />
        New project
      </Button>

      <Drawer open={open} onClose={() => setOpen(false)} title="Create project">
        <form action={formAction} className="space-y-4">
          {state.error && (
            <div
              className="flex items-start gap-2 rounded-control border px-3 py-2.5 text-sm"
              style={{ borderColor: "var(--status-overdue)", color: "var(--status-overdue)" }}
            >
              <IconAlertCircle size={16} className="mt-0.5 shrink-0" />
              {state.error}
            </div>
          )}

          <div>
            <Label htmlFor="name">Project name</Label>
            <Input id="name" name="name" required placeholder="S/4HANA Rollout — Phase 2" />
          </div>

          <div>
            <Label htmlFor="client_name">Client</Label>
            <Input id="client_name" name="client_name" required placeholder="Acme Corp" />
          </div>

          <div>
            <Label htmlFor="code">Project code</Label>
            <Input id="code" name="code" required placeholder="ACME-02" className="font-mono uppercase" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start_date">Start date</Label>
              <Input id="start_date" name="start_date" type="date" />
            </div>
            <div>
              <Label htmlFor="target_go_live">Target go-live</Label>
              <Input id="target_go_live" name="target_go_live" type="date" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="company_code">Company code</Label>
              <select id="company_code" name="company_code" className={selectClass} defaultValue="">
                <option value="">—</option>
                {companyCodes.map((c) => (
                  <option key={c.id} value={c.value}>{c.value}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="stream">Stream</Label>
              <select id="stream" name="stream" className={selectClass} defaultValue="">
                <option value="">—</option>
                {streams.map((s) => (
                  <option key={s.id} value={s.value}>{s.value}</option>
                ))}
              </select>
            </div>
          </div>

          {pmOptions.length > 0 && (
            <div>
              <Label htmlFor="pm_id">Project manager</Label>
              <select
                id="pm_id"
                name="pm_id"
                className="h-10 w-full rounded-control border border-border-2 bg-surface-2 px-3 text-sm text-text focus:border-brass focus-visible:outline-none"
              >
                {pmOptions.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating…" : "Create project"}
          </Button>
        </form>
      </Drawer>
    </>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { IconAlertCircle, IconCircleCheck, IconPencil } from "@tabler/icons-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { updateProject, type UpdateProjectState } from "@/lib/actions/projects";
import type { Project } from "@/lib/types/database";

const initialState: UpdateProjectState = { error: null, success: false };
const selectClass =
  "h-10 w-full rounded-control border border-border-2 bg-surface-2 px-3 text-sm text-text focus:border-brass focus-visible:outline-none";

export function EditProjectButton({
  project,
  pmOptions,
}: {
  project: Project;
  pmOptions: { id: string; full_name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const boundAction = updateProject.bind(null, project.id);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      setOpen(false);
    }
    wasPending.current = pending;
  }, [pending, state.error]);

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <IconPencil size={14} />
        Edit project
      </Button>

      <Drawer open={open} onClose={() => setOpen(false)} title="Edit project">
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
          {state.success && (
            <div
              className="flex items-start gap-2 rounded-control border px-3 py-2.5 text-sm"
              style={{ borderColor: "var(--status-live)", color: "var(--status-live)" }}
            >
              <IconCircleCheck size={16} className="mt-0.5 shrink-0" />
              Saved.
            </div>
          )}

          <div>
            <Label htmlFor="name">Project name</Label>
            <Input id="name" name="name" required defaultValue={project.name} />
          </div>

          <div>
            <Label htmlFor="client_name">Client</Label>
            <Input id="client_name" name="client_name" required defaultValue={project.client_name} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="code">Project code</Label>
              <Input
                id="code"
                name="code"
                required
                defaultValue={project.code}
                className="font-mono uppercase"
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" className={selectClass} defaultValue={project.status}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="start_date">Start date</Label>
              <Input id="start_date" name="start_date" type="date" defaultValue={project.start_date ?? ""} />
            </div>
            <div>
              <Label htmlFor="target_go_live">Target go-live</Label>
              <Input
                id="target_go_live"
                name="target_go_live"
                type="date"
                defaultValue={project.target_go_live ?? ""}
              />
            </div>
          </div>

          {pmOptions.length > 0 && (
            <div>
              <Label htmlFor="pm_id">Project manager</Label>
              <select id="pm_id" name="pm_id" className={selectClass} defaultValue={project.pm_id ?? ""}>
                <option value="">Unassigned</option>
                {pmOptions.map((pm) => (
                  <option key={pm.id} value={pm.id}>{pm.full_name}</option>
                ))}
              </select>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Drawer>
    </>
  );
}

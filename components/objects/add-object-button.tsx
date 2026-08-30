"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { IconAlertCircle, IconPlus } from "@tabler/icons-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  useCompanyCodes,
  useComplexities,
  useModules,
  useStatuses,
  useStreams,
} from "@/components/providers/picklist-provider";
import { createObject, type FormActionState } from "@/lib/actions/objects";
import { OBJECT_TYPE_META } from "@/lib/object-meta";
import type { ConsultantType } from "@/lib/types/database";

const initialState: FormActionState = { error: null };
const selectClass =
  "h-10 w-full rounded-control border border-border-2 bg-surface-2 px-3 text-sm text-text focus:border-brass focus-visible:outline-none";

type ResourceOption = { id: string; full_name: string; email: string; consultant_type: ConsultantType | null };

const isFunctional = (v: string | null) => (v ?? "").trim().toLowerCase() === "functional";
const isTechnical = (v: string | null) => (v ?? "").trim().toLowerCase() === "technical";

export function AddObjectButton({
  projectId,
  resources,
}: {
  projectId: string;
  resources: ResourceOption[];
}) {
  const modules = useModules();
  const complexities = useComplexities();
  const companyCodes = useCompanyCodes();
  const streams = useStreams();
  const statuses = useStatuses();
  const functionalResources = resources.filter((r) => isFunctional(r.consultant_type));
  const technicalResources = resources.filter((r) => isTechnical(r.consultant_type));
  const [open, setOpen] = useState(false);
  const boundAction = createObject.bind(null, projectId);
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
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <IconPlus size={15} />
        Add object
      </Button>

      <Drawer open={open} onClose={() => setOpen(false)} title="Add object">
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

          <p className="text-xs text-text-3">
            The object ID is generated automatically from the project, module, and object type.
          </p>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required placeholder="Vendor onboarding approval" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="object_type">Object type</Label>
              <select id="object_type" name="object_type" required className={selectClass}>
                {Object.keys(OBJECT_TYPE_META).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" required className={selectClass} defaultValue={statuses[0]?.value ?? ""}>
                {statuses.map((s) => (
                  <option key={s.id} value={s.value}>{s.value}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="module">Module</Label>
              <select id="module" name="module" className={selectClass} defaultValue="">
                <option value="">—</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.value}>{m.value}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="complexity">Complexity</Label>
              <select id="complexity" name="complexity" className={selectClass} defaultValue="">
                <option value="">—</option>
                {complexities.map((c) => (
                  <option key={c.id} value={c.value}>{c.value}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="functional_resource_id">Functional consultant</Label>
              <select id="functional_resource_id" name="functional_resource_id" className={selectClass} defaultValue="">
                <option value="">Unassigned</option>
                {functionalResources.map((r) => (
                  <option key={r.id} value={r.id}>{r.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="technical_resource_id">Technical consultant</Label>
              <select id="technical_resource_id" name="technical_resource_id" className={selectClass} defaultValue="">
                <option value="">Unassigned</option>
                {technicalResources.map((r) => (
                  <option key={r.id} value={r.id}>{r.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="company_code">Company code</Label>
              <select id="company_code" name="company_code" className={selectClass} defaultValue="">
                <option value="">Use project default</option>
                {companyCodes.map((c) => (
                  <option key={c.id} value={c.value}>{c.value}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="business_unit">Business unit</Label>
              <Input id="business_unit" name="business_unit" maxLength={15} placeholder="e.g. US10" />
            </div>
            <div>
              <Label htmlFor="stream">Stream</Label>
              <select id="stream" name="stream" className={selectClass} defaultValue="">
                <option value="">Use project default</option>
                {streams.map((s) => (
                  <option key={s.id} value={s.value}>{s.value}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="due_date">Due date</Label>
              <Input id="due_date" name="due_date" type="date" />
            </div>
            <div>
              <Label htmlFor="fds_received">FDS received</Label>
              <select id="fds_received" name="fds_received" className={selectClass} defaultValue="no">
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Description of the technical object…"
              className="w-full resize-none rounded-control border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text focus:border-brass focus-visible:outline-none"
            />
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Adding…" : "Add object"}
          </Button>
        </form>
      </Drawer>
    </>
  );
}

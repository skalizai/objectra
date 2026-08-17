"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { IconAlertCircle, IconPlus } from "@tabler/icons-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useCompanyCodes, useComplexities, useDevTypes, useModules } from "@/components/providers/picklist-provider";
import { createBacklogItem, type FormActionState } from "@/lib/actions/backlog";

const initialState: FormActionState = { error: null };
const selectClass =
  "h-10 w-full rounded-control border border-border-2 bg-surface-2 px-3 text-sm text-text focus:border-brass focus-visible:outline-none";

export function AddBacklogItemButton({ projectId }: { projectId: string }) {
  const modules = useModules();
  const complexities = useComplexities();
  const companyCodes = useCompanyCodes();
  const devTypes = useDevTypes();
  const [open, setOpen] = useState(false);
  const boundAction = createBacklogItem.bind(null, projectId);
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
      <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
        <IconPlus size={15} />
        Register item
      </Button>

      <Drawer open={open} onClose={() => setOpen(false)} title="Register backlog item" width={480}>
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

          <p className="text-xs text-text-3">The item number is generated automatically once you save.</p>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              required
              rows={2}
              placeholder="What's being requested?"
              className="w-full resize-none rounded-control border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text focus:border-brass focus-visible:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="module">Module</Label>
              <select id="module" name="module" className={selectClass} defaultValue="">
                <option value="">—</option>
                {modules.map((m) => <option key={m.id} value={m.value}>{m.value}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="dev_type">Type</Label>
              <select id="dev_type" name="dev_type" className={selectClass} defaultValue="">
                <option value="">—</option>
                {devTypes.map((t) => <option key={t.id} value={t.value}>{t.value}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lob">LOB</Label>
              <Input id="lob" name="lob" placeholder="e.g. BPC, BPP" />
            </div>
            <div>
              <Label htmlFor="company_code">Company code</Label>
              <select id="company_code" name="company_code" className={selectClass} defaultValue="">
                <option value="">—</option>
                {companyCodes.map((c) => <option key={c.id} value={c.value}>{c.value}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="requested_by">Requested by</Label>
              <Input id="requested_by" name="requested_by" placeholder="Client contact" />
            </div>
            <div>
              <Label htmlFor="go_live_critical">Go-live critical</Label>
              <select id="go_live_critical" name="go_live_critical" className={selectClass} defaultValue="no">
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="dev_days">Dev effort (days)</Label>
              <Input id="dev_days" name="dev_days" type="number" min={0} step={0.5} defaultValue={0} />
            </div>
            <div>
              <Label htmlFor="fiori_days">Fiori effort (days)</Label>
              <Input id="fiori_days" name="fiori_days" type="number" min={0} step={0.5} defaultValue={0} />
            </div>
            <div>
              <Label htmlFor="func_days">Functional effort (days)</Label>
              <Input id="func_days" name="func_days" type="number" min={0} step={0.5} defaultValue={0} />
            </div>
          </div>

          <div>
            <Label htmlFor="complexity">Complexity</Label>
            <select id="complexity" name="complexity" className={selectClass} defaultValue="">
              <option value="">Auto (from dev days)</option>
              {complexities.map((c) => <option key={c.id} value={c.value}>{c.value}</option>)}
            </select>
          </div>

          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <textarea
              id="remarks"
              name="remarks"
              rows={2}
              placeholder="Optional notes…"
              className="w-full resize-none rounded-control border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text focus:border-brass focus-visible:outline-none"
            />
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Registering…" : "Register item"}
          </Button>
        </form>
      </Drawer>
    </>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { IconAlertCircle, IconArrowRight, IconTrash } from "@tabler/icons-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useCompanyCodes, useComplexities, useDevTypes, useModules } from "@/components/providers/picklist-provider";
import { updateBacklogItem, deleteBacklogItem, updateBacklogStatus, moveToObjects, type FormActionState } from "@/lib/actions/backlog";
import { BacklogStatusPill } from "@/components/backlog/backlog-status-pill";
import type { BacklogItemStatus, BacklogItemWithCost } from "@/lib/types/database";

const initialState: FormActionState = { error: null };
const selectClass =
  "h-10 w-full rounded-control border border-border-2 bg-surface-2 px-3 text-sm text-text focus:border-brass focus-visible:outline-none";
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function StatusActions({ item, projectId, onDone }: { item: BacklogItemWithCost; projectId: string; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function transition(status: Extract<BacklogItemStatus, "approved" | "rejected" | "on_hold" | "registered">) {
    setError(null);
    startTransition(async () => {
      const result = await updateBacklogStatus(item.id, projectId, status);
      if (result.error) setError(result.error);
      else onDone();
    });
  }

  function move() {
    setError(null);
    startTransition(async () => {
      const result = await moveToObjects(item.id, projectId);
      if (result.error) setError(result.error);
      else onDone();
    });
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs" style={{ color: "var(--status-overdue)" }}>{error}</p>}
      <div className="flex flex-wrap gap-2">
        {item.status === "sent_for_approval" && (
          <>
            <Button size="sm" disabled={isPending} onClick={() => transition("approved")}>Mark approved</Button>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => transition("rejected")}>Reject</Button>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => transition("on_hold")}>On hold</Button>
          </>
        )}
        {item.status === "approved" && (
          <Button size="sm" disabled={isPending} onClick={move} className="gap-1.5">
            Move to objects <IconArrowRight size={14} />
          </Button>
        )}
        {(item.status === "rejected" || item.status === "on_hold") && (
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => transition("registered")}>
            Re-register
          </Button>
        )}
      </div>
    </div>
  );
}

function BacklogItemForm({
  item,
  projectId,
  canEdit,
  onSaved,
  onDeleted,
}: {
  item: BacklogItemWithCost;
  projectId: string;
  canEdit: boolean;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const modules = useModules();
  const complexities = useComplexities();
  const companyCodes = useCompanyCodes();
  const devTypes = useDevTypes();
  const boundAction = updateBacklogItem.bind(null, item.id, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const wasPending = useRef(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) onSaved();
    wasPending.current = pending;
  }, [pending, state.error, onSaved]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-xs text-text-3">{item.item_no || "Generating…"}</div>
          {item.cr_no && <div className="text-xs text-text-3">CR {item.cr_no}</div>}
        </div>
        <BacklogStatusPill status={item.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-control border border-border-2 bg-surface-2 px-3 py-2.5 text-xs text-text-2 sm:grid-cols-4">
        <div><div className="text-text-3">Dev</div><div className="font-medium text-text">{money(item.dev_cost)}</div></div>
        <div><div className="text-text-3">Fiori</div><div className="font-medium text-text">{money(item.fiori_cost)}</div></div>
        <div><div className="text-text-3">PMO</div><div className="font-medium text-text">{money(item.pmo_cost)}</div></div>
        <div><div className="text-text-3">PGLS</div><div className="font-medium text-text">{money(item.pgls_cost)}</div></div>
        <div className="col-span-2 sm:col-span-4 border-t border-border pt-2">
          <span className="text-text-3">Total</span>{" "}
          <span className="font-medium text-text">{item.total_days.toFixed(1)}d · {money(item.total_cost)}</span>
        </div>
      </div>

      {item.status === "moved_to_objects" && (
        <p className="text-xs text-text-3">This item has been moved to the objects register.</p>
      )}

      {canEdit && item.status !== "moved_to_objects" && <StatusActions item={item} projectId={projectId} onDone={onSaved} />}

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
          <Label htmlFor="description">Description</Label>
          {canEdit ? (
            <textarea
              id="description"
              name="description"
              required
              rows={2}
              defaultValue={item.description}
              className="w-full resize-none rounded-control border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text focus:border-brass focus-visible:outline-none"
            />
          ) : (
            <p className="text-sm text-text-2">{item.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="module">Module</Label>
            {canEdit ? (
              <select id="module" name="module" className={selectClass} defaultValue={item.module ?? ""}>
                <option value="">—</option>
                {modules.map((m) => <option key={m.id} value={m.value}>{m.value}</option>)}
              </select>
            ) : (
              <p className="text-sm text-text-2">{item.module || "—"}</p>
            )}
          </div>
          <div>
            <Label htmlFor="dev_type">Type</Label>
            {canEdit ? (
              <select id="dev_type" name="dev_type" className={selectClass} defaultValue={item.dev_type ?? ""}>
                <option value="">—</option>
                {devTypes.map((t) => <option key={t.id} value={t.value}>{t.value}</option>)}
              </select>
            ) : (
              <p className="text-sm text-text-2">{item.dev_type || "—"}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="lob">LOB</Label>
            {canEdit ? <Input id="lob" name="lob" defaultValue={item.lob ?? ""} /> : <p className="text-sm text-text-2">{item.lob || "—"}</p>}
          </div>
          <div>
            <Label htmlFor="company_code">Company code</Label>
            {canEdit ? (
              <select id="company_code" name="company_code" className={selectClass} defaultValue={item.company_code ?? ""}>
                <option value="">—</option>
                {companyCodes.map((c) => <option key={c.id} value={c.value}>{c.value}</option>)}
              </select>
            ) : (
              <p className="text-sm text-text-2">{item.company_code || "—"}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="requested_by">Requested by</Label>
            {canEdit ? <Input id="requested_by" name="requested_by" defaultValue={item.requested_by ?? ""} /> : <p className="text-sm text-text-2">{item.requested_by || "—"}</p>}
          </div>
          <div>
            <Label htmlFor="go_live_critical">Go-live critical</Label>
            {canEdit ? (
              <select id="go_live_critical" name="go_live_critical" className={selectClass} defaultValue={item.go_live_critical ? "yes" : "no"}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            ) : (
              <p className="text-sm text-text-2">{item.go_live_critical ? "Yes" : "No"}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="dev_days">Dev days</Label>
            {canEdit ? <Input id="dev_days" name="dev_days" type="number" min={0} step={0.5} defaultValue={item.dev_days} /> : <p className="text-sm text-text-2">{item.dev_days}</p>}
          </div>
          <div>
            <Label htmlFor="fiori_days">Fiori days</Label>
            {canEdit ? <Input id="fiori_days" name="fiori_days" type="number" min={0} step={0.5} defaultValue={item.fiori_days} /> : <p className="text-sm text-text-2">{item.fiori_days}</p>}
          </div>
          <div>
            <Label htmlFor="func_days">Functional days</Label>
            {canEdit ? <Input id="func_days" name="func_days" type="number" min={0} step={0.5} defaultValue={item.func_days} /> : <p className="text-sm text-text-2">{item.func_days}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="complexity">Complexity</Label>
          {canEdit ? (
            <select id="complexity" name="complexity" className={selectClass} defaultValue={item.complexity ?? ""}>
              <option value="">Auto (from dev days)</option>
              {complexities.map((c) => <option key={c.id} value={c.value}>{c.value}</option>)}
            </select>
          ) : (
            <p className="text-sm text-text-2">{item.complexity || "—"}</p>
          )}
        </div>

        <div>
          <Label htmlFor="remarks">Remarks</Label>
          {canEdit ? (
            <textarea
              id="remarks"
              name="remarks"
              rows={2}
              defaultValue={item.remarks ?? ""}
              className="w-full resize-none rounded-control border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text focus:border-brass focus-visible:outline-none"
            />
          ) : (
            <p className="text-sm text-text-2">{item.remarks || "—"}</p>
          )}
        </div>

        {canEdit && (
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        )}
      </form>

      {canEdit && (
        <div className="border-t border-border pt-4">
          {deleteError && <p className="mb-2 text-xs" style={{ color: "var(--status-overdue)" }}>{deleteError}</p>}
          {!confirmingDelete ? (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="flex items-center gap-1.5 text-xs text-text-3 hover:text-status-overdue"
            >
              <IconTrash size={13} />
              Delete item
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-text-3">Delete permanently?</span>
              <button
                disabled={isDeleting}
                onClick={() =>
                  startDeleteTransition(async () => {
                    const result = await deleteBacklogItem(item.id, projectId);
                    if (result.error) setDeleteError(result.error);
                    else onDeleted();
                  })
                }
                className="rounded-[6px] px-1.5 py-0.5 text-[11px] font-medium text-white"
                style={{ background: "var(--status-overdue)" }}
              >
                {isDeleting ? "…" : "Yes"}
              </button>
              <button disabled={isDeleting} onClick={() => setConfirmingDelete(false)} className="text-[11px] text-text-3 hover:text-text-2">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function BacklogItemDrawer({
  item,
  projectId,
  canEdit,
  onClose,
  onChanged,
}: {
  item: BacklogItemWithCost | null;
  projectId: string;
  canEdit: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  return (
    <Drawer open={!!item} onClose={onClose} title={item?.item_no ?? "Backlog item"} width={480}>
      {item && (
        <BacklogItemForm
          key={item.id}
          item={item}
          projectId={projectId}
          canEdit={canEdit}
          onSaved={onChanged}
          onDeleted={() => {
            onChanged();
            onClose();
          }}
        />
      )}
    </Drawer>
  );
}

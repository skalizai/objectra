"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { IconAlertCircle, IconPlus } from "@tabler/icons-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createTicket, uploadTicketAttachment, type CreateTicketState } from "@/lib/actions/tickets";
import type { TicketCriticality } from "@/lib/types/database";

const initialState: CreateTicketState = { error: null };
const selectClass =
  "h-10 w-full rounded-control border border-border-2 bg-surface-2 px-3 text-sm text-text focus:border-brass focus-visible:outline-none";

const CRITICALITY_OPTIONS: { value: TicketCriticality; label: string; description: string }[] = [
  { value: "P1_critical", label: "P1 · Critical", description: "Production is down or unusable for everyone." },
  { value: "P2_high", label: "P2 · High", description: "A key process is blocked; there's no workaround." },
  { value: "P3_medium", label: "P3 · Medium", description: "Something's wrong but there's a workaround." },
  { value: "P4_low", label: "P4 · Low", description: "Minor issue or a question." },
];

export function RaiseTicketForm({
  projectId,
  modules,
  objectOptions,
}: {
  projectId: string;
  modules: string[];
  objectOptions: { id: string; title: string; wricef_id: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  const [draftId] = useState(() => crypto.randomUUID());
  const [pendingPaths, setPendingPaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const boundAction = createTicket.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      setOpen(false);
      setPendingPaths([]);
    }
    wasPending.current = pending;
  }, [pending, state.error]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    const result = await uploadTicketAttachment(projectId, draftId, fd);
    if (result.path) setPendingPaths((prev) => [...prev, result.path!]);
    setUploading(false);
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
        <IconPlus size={15} />
        Raise ticket
      </Button>

      <Drawer open={open} onClose={() => setOpen(false)} title="Raise a support ticket">
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
          {state.ticketNo && (
            <div
              className="flex items-start gap-2 rounded-control border px-3 py-2.5 text-sm"
              style={{ borderColor: "var(--status-live)", color: "var(--status-live)" }}
            >
              Ticket {state.ticketNo} submitted.
            </div>
          )}

          <input type="hidden" name="draft_id" value={draftId} />
          {pendingPaths.map((p) => (
            <input key={p} type="hidden" name="pending_path" value={p} />
          ))}

          <div>
            <Label htmlFor="module">Module</Label>
            <select id="module" name="module" required className={selectClass} defaultValue="">
              <option value="" disabled>Select a module…</option>
              {modules.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>Criticality</Label>
            <div className="space-y-2">
              {CRITICALITY_OPTIONS.map((c) => (
                <label
                  key={c.value}
                  className="flex cursor-pointer items-start gap-2.5 rounded-control border border-border-2 bg-surface-2 px-3 py-2.5"
                >
                  <input type="radio" name="criticality" value={c.value} required className="mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium text-text">{c.label}</span>
                    <span className="block text-xs text-text-3">{c.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" required placeholder="Unable to post goods receipt" />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="What happened, and what did you expect instead?"
              className="w-full resize-none rounded-control border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text focus:border-brass focus-visible:outline-none"
            />
          </div>

          {objectOptions.length > 0 && (
            <div>
              <Label htmlFor="related_object_id">Related object (optional)</Label>
              <select id="related_object_id" name="related_object_id" className={selectClass} defaultValue="">
                <option value="">—</option>
                {objectOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.wricef_id ? `${o.wricef_id} — ` : ""}{o.title}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label htmlFor="attachment">Attachment (optional)</Label>
            <input id="attachment" type="file" onChange={handleFile} className="text-sm text-text-2" />
            {uploading && <p className="mt-1 text-xs text-text-3">Uploading…</p>}
            {pendingPaths.length > 0 && (
              <p className="mt-1 text-xs text-text-3">{pendingPaths.length} file(s) attached.</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={pending || uploading}>
            {pending ? "Submitting…" : "Submit ticket"}
          </Button>
        </form>
      </Drawer>
    </>
  );
}

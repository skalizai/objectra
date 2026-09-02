"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { IconAlertCircle, IconPlus } from "@tabler/icons-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createTicket, type CreateTicketState } from "@/lib/actions/tickets";
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

type ConsultantOption = { id: string; full_name: string };

/** yyyy-MM-ddThh:mm in the browser's local timezone -- the format
 * <input type="datetime-local"> requires for its value/defaultValue. */
function nowLocalInput(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function RaiseTicketForm({
  projectId,
  modules,
  isManager = false,
  functionalConsultants = [],
  technicalConsultants = [],
}: {
  projectId: string;
  modules: string[];
  /** Org_admin/PM/technical_lead only -- lets them log a ticket on behalf
   * of someone else (phone/email/Teams reports) with manual reported-by /
   * assigned-to and backdated report/resolution timestamps. A super_user
   * raising their own ticket never sees these -- they ARE the raiser, and
   * manually assigning would undermine the module's auto-routing. */
  isManager?: boolean;
  functionalConsultants?: ConsultantOption[];
  technicalConsultants?: ConsultantOption[];
}) {
  const [open, setOpen] = useState(false);
  const boundAction = createTicket.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      setOpen(false);
    }
    wasPending.current = pending;
  }, [pending, state.error]);

  // <input type="datetime-local"> has no timezone info -- its value is a
  // bare wall-clock string in whatever timezone the browser is in. Parsing
  // that same string server-side would use the SERVER's timezone instead
  // (wrong on Vercel, which runs in UTC), silently shifting the timestamp.
  // Converting to a real ISO string here, in the browser, uses the correct
  // (the raiser's) timezone.
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    for (const [localName, utcName] of [["reported_at", "reported_at_utc"], ["resolved_at", "resolved_at_utc"]] as const) {
      const localInput = form.elements.namedItem(localName) as HTMLInputElement | null;
      const utcInput = form.elements.namedItem(utcName) as HTMLInputElement | null;
      if (utcInput) utcInput.value = localInput?.value ? new Date(localInput.value).toISOString() : "";
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
        <IconPlus size={15} />
        Raise ticket
      </Button>

      <Drawer open={open} onClose={() => setOpen(false)} title="Raise a support ticket">
        <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
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

          {isManager && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="reported_by_resource_id">Issue reported by</Label>
                  <select id="reported_by_resource_id" name="reported_by_resource_id" className={selectClass} defaultValue="">
                    <option value="">You (default)</option>
                    {functionalConsultants.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="assigned_to_resource_id">Issue assigned to</Label>
                  <select id="assigned_to_resource_id" name="assigned_to_resource_id" className={selectClass} defaultValue="">
                    <option value="">Auto-route by module</option>
                    {technicalConsultants.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="reported_at">Issue report date &amp; time</Label>
                  <Input id="reported_at" name="reported_at" type="datetime-local" defaultValue={nowLocalInput()} />
                </div>
                <div>
                  <Label htmlFor="resolved_at">Issue resolution date &amp; time</Label>
                  <Input id="resolved_at" name="resolved_at" type="datetime-local" />
                  <p className="mt-1 text-xs text-text-3">Leave blank if it&apos;s still open.</p>
                </div>
              </div>
              <input type="hidden" name="reported_at_utc" />
              <input type="hidden" name="resolved_at_utc" />
            </>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Submitting…" : "Submit ticket"}
          </Button>
        </form>
      </Drawer>
    </>
  );
}

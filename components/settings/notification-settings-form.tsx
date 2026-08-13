"use client";

import { useActionState, useState, useTransition } from "react";
import { IconAlertCircle, IconCircleCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import {
  sendTestDigest,
  updateNotificationSettings,
  type SimpleActionState,
} from "@/lib/actions/settings";
import { sendTestTicketEmail } from "@/lib/actions/support-settings";
import type { NotificationSettings, Picklist } from "@/lib/types/database";

const initialState: SimpleActionState = { error: null, success: false };

export function NotificationSettingsForm({
  projectId,
  settings,
  statuses,
}: {
  projectId: string;
  settings: NotificationSettings;
  statuses: Picklist[];
}) {
  const boundAction = updateNotificationSettings.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [testState, setTestState] = useState<{ error: string | null; success: boolean } | null>(null);
  const [isSendingTest, startTestTransition] = useTransition();
  const [ticketTestState, setTicketTestState] = useState<{ error: string | null; success: boolean } | null>(null);
  const [isSendingTicketTest, startTicketTestTransition] = useTransition();
  const [clientsChecked, setClientsChecked] = useState(settings.digest_recipients?.clients ?? true);

  return (
    <div className="rounded-card border border-border bg-surface p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <h3 className="font-display text-sm font-semibold">Notifications</h3>

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
            Settings saved.
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-text-2">
          <input type="checkbox" name="deadline_alerts_enabled" defaultChecked={settings.deadline_alerts_enabled} />
          Deadline alerts enabled
        </label>

        <div>
          <Label htmlFor="deadline_lead_days">Alert lead time (days)</Label>
          <input
            id="deadline_lead_days"
            name="deadline_lead_days"
            type="number"
            min={1}
            max={60}
            defaultValue={settings.deadline_lead_days}
            className="h-9 w-24 rounded-control border border-border-2 bg-surface-2 px-2.5 text-sm text-text focus:border-brass focus-visible:outline-none"
          />
        </div>

        <hr className="border-border" />

        <label className="flex items-center gap-2 text-sm text-text-2">
          <input type="checkbox" name="ticket_emails_enabled" defaultChecked={settings.ticket_emails_enabled ?? true} />
          Ticket emails enabled (created, assigned, status changes)
        </label>
        <label className="flex items-center gap-2 text-sm text-text-2">
          <input type="checkbox" name="sla_alerts_enabled" defaultChecked={settings.sla_alerts_enabled ?? true} />
          SLA breach/warning alerts enabled
        </label>

        <hr className="border-border" />

        <label className="flex items-center gap-2 text-sm text-text-2">
          <input type="checkbox" name="weekly_digest_enabled" defaultChecked={settings.weekly_digest_enabled} />
          Weekly digest enabled
        </label>

        <div>
          <Label htmlFor="digest_day">Digest day</Label>
          <select
            id="digest_day"
            name="digest_day"
            defaultValue={settings.digest_day}
            className="h-9 rounded-control border border-border-2 bg-surface-2 px-2.5 text-sm text-text focus:border-brass focus-visible:outline-none"
          >
            {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => (
              <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label>Statuses to include</Label>
          <p className="text-xs text-text-3">
            Leave all unchecked to include the whole project. Otherwise every count in the digest
            (total, live, at risk, % complete, moved this week) only considers objects currently in
            one of the checked statuses.
          </p>
          {statuses.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm text-text-2">
              <input
                type="checkbox"
                name="digest_statuses"
                value={s.value}
                defaultChecked={(settings.digest_statuses ?? []).includes(s.value)}
              />
              {s.value}
            </label>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label>Recipients</Label>
          <label className="flex items-center gap-2 text-sm text-text-2">
            <input type="checkbox" name="recipients_pms" defaultChecked={settings.digest_recipients?.pms ?? true} />
            Team (Project Manager, Technical Lead, Members)
          </label>
          <label className="flex items-center gap-2 text-sm text-text-2">
            <input type="checkbox" name="recipients_pmo" defaultChecked={settings.digest_recipients?.pmo ?? true} />
            PMO
          </label>
          <label className="flex items-center gap-2 text-sm text-text-2">
            <input
              type="checkbox"
              name="recipients_clients"
              checked={clientsChecked}
              onChange={(e) => setClientsChecked(e.target.checked)}
            />
            Clients
          </label>

          {/* Kept mounted (just visually hidden) rather than unmounted when
              Clients is off, so unchecking it and saving doesn't wipe out an
              already-typed address list — the digest job itself is what
              skips these addresses while Clients is unchecked. */}
          <div className={clientsChecked ? "pl-6 pt-1" : "hidden"}>
            <Label htmlFor="extra_digest_emails">Client email addresses</Label>
            <textarea
              id="extra_digest_emails"
              name="extra_digest_emails"
              rows={2}
              defaultValue={(settings.extra_digest_emails ?? []).join(", ")}
              placeholder="jane@client.com, john@partner.com"
              className="w-full resize-none rounded-control border border-border-2 bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-brass focus-visible:outline-none"
            />
            <p className="mt-1 text-xs text-text-3">
              Clients without an Objectra login — comma or newline separated.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save settings"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isSendingTest}
            onClick={() =>
              startTestTransition(async () => {
                setTestState(await sendTestDigest(projectId));
              })
            }
          >
            {isSendingTest ? "Sending…" : "Send test digest"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isSendingTicketTest}
            onClick={() =>
              startTicketTestTransition(async () => {
                setTicketTestState(await sendTestTicketEmail(projectId));
              })
            }
          >
            {isSendingTicketTest ? "Sending…" : "Send test ticket email"}
          </Button>
        </div>

        {testState && (
          <p className="text-xs" style={{ color: testState.success ? "var(--status-live)" : "var(--status-overdue)" }}>
            {testState.success ? "Test digest sent." : testState.error}
          </p>
        )}
        {ticketTestState && (
          <p className="text-xs" style={{ color: ticketTestState.success ? "var(--status-live)" : "var(--status-overdue)" }}>
            {ticketTestState.success ? "Test ticket email sent." : ticketTestState.error}
          </p>
        )}
      </form>
    </div>
  );
}

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
import type { NotificationSettings } from "@/lib/types/database";

const initialState: SimpleActionState = { error: null, success: false };

export function NotificationSettingsForm({
  projectId,
  settings,
}: {
  projectId: string;
  settings: NotificationSettings;
}) {
  const boundAction = updateNotificationSettings.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [testState, setTestState] = useState<{ error: string | null; success: boolean } | null>(null);
  const [isSendingTest, startTestTransition] = useTransition();

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
          <Label>Recipients</Label>
          <label className="flex items-center gap-2 text-sm text-text-2">
            <input type="checkbox" name="recipients_pms" defaultChecked={settings.digest_recipients?.pms ?? true} />
            Project managers
          </label>
          <label className="flex items-center gap-2 text-sm text-text-2">
            <input type="checkbox" name="recipients_clients" defaultChecked={settings.digest_recipients?.clients ?? true} />
            Clients
          </label>
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
        </div>

        {testState && (
          <p className="text-xs" style={{ color: testState.success ? "var(--status-live)" : "var(--status-overdue)" }}>
            {testState.success ? "Test digest sent." : testState.error}
          </p>
        )}
      </form>
    </div>
  );
}

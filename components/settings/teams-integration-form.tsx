"use client";

import { useState } from "react";
import { IconAlertCircle, IconCircleCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { upsertTeamsConnection, sendTestTeamsCard } from "@/lib/actions/teams-settings";
import type { IntegrationLogEntry, TeamsConnection } from "@/lib/types/database";

const inputClass =
  "h-9 w-full rounded-control border border-border-2 bg-surface-2 px-2.5 text-sm text-text focus:border-brass focus-visible:outline-none";

function maskedSecret(secret: string | null) {
  if (!secret) return "Not set";
  return `••••••${secret.slice(-6)}`;
}

export function TeamsIntegrationForm({
  projectId,
  connection,
  log,
}: {
  projectId: string;
  connection: TeamsConnection | null;
  log: IntegrationLogEntry[];
}) {
  const [teamName, setTeamName] = useState(connection?.team_name ?? "");
  const [channelName, setChannelName] = useState(connection?.channel_name ?? "");
  const [webhookUrl, setWebhookUrl] = useState(connection?.outbound_webhook_url ?? "");
  const [hmacInput, setHmacInput] = useState("");
  const [notifyCreated, setNotifyCreated] = useState(connection?.notify_created ?? true);
  const [notifyStatus, setNotifyStatus] = useState(connection?.notify_status ?? true);
  const [notifySla, setNotifySla] = useState(connection?.notify_sla ?? true);
  const [isActive, setIsActive] = useState(connection?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  async function save() {
    setSaving(true);
    setMessage(null);
    const result = await upsertTeamsConnection(projectId, {
      team_name: teamName.trim() || null,
      channel_name: channelName.trim() || null,
      outbound_webhook_url: webhookUrl.trim() || null,
      ...(hmacInput.trim() ? { inbound_hmac_secret: hmacInput.trim() } : {}),
      notify_created: notifyCreated,
      notify_status: notifyStatus,
      notify_sla: notifySla,
      is_active: isActive,
    });
    setSaving(false);
    setHmacInput("");
    setMessage(result.error ? { type: "error", text: result.error } : { type: "success", text: "Saved." });
  }

  async function sendTest() {
    setTesting(true);
    setMessage(null);
    const result = await sendTestTeamsCard(projectId);
    setTesting(false);
    setMessage(
      result.error
        ? { type: "error", text: result.error }
        : { type: "success", text: "Test card sent — check the channel." },
    );
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <h3 className="font-display text-sm font-semibold">Microsoft Teams</h3>
      <p className="mt-1 text-xs text-text-3">
        Raise tickets from a Teams channel with <code>@Objectra ticket ...</code> / <code>@Objectra status ...</code>,
        and get ticket updates posted back automatically.
      </p>

      {message && (
        <div
          className="mt-3 flex items-start gap-2 rounded-control border px-3 py-2.5 text-sm"
          style={{
            borderColor: message.type === "error" ? "var(--status-overdue)" : "var(--status-live)",
            color: message.type === "error" ? "var(--status-overdue)" : "var(--status-live)",
          }}
        >
          {message.type === "error" ? <IconAlertCircle size={16} className="mt-0.5 shrink-0" /> : <IconCircleCheck size={16} className="mt-0.5 shrink-0" />}
          {message.text}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="team_name">Team name</Label>
          <Input id="team_name" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Onex Holding" />
        </div>
        <div>
          <Label htmlFor="channel_name">Channel name</Label>
          <Input id="channel_name" value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="ShiftX Hypercare" />
        </div>
      </div>

      <div className="mt-3">
        <Label htmlFor="webhook_url">Incoming Webhook / Workflow URL (outbound)</Label>
        <Input
          id="webhook_url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://…webhook.office.com/…"
          className="font-mono text-xs"
        />
      </div>

      <div className="mt-3">
        <Label htmlFor="hmac_secret">Outgoing Webhook HMAC secret (inbound)</Label>
        <input
          id="hmac_secret"
          value={hmacInput}
          onChange={(e) => setHmacInput(e.target.value)}
          placeholder={`Currently: ${maskedSecret(connection?.inbound_hmac_secret ?? null)} — paste a new value to replace it`}
          className={`${inputClass} font-mono text-xs`}
        />
      </div>

      <div className="mt-4 space-y-2">
        <label className="flex items-center gap-2 text-sm text-text-2">
          <input type="checkbox" checked={notifyCreated} onChange={(e) => setNotifyCreated(e.target.checked)} />
          Post a card when a ticket is created
        </label>
        <label className="flex items-center gap-2 text-sm text-text-2">
          <input type="checkbox" checked={notifyStatus} onChange={(e) => setNotifyStatus(e.target.checked)} />
          Post a card on assignment/status changes
        </label>
        <label className="flex items-center gap-2 text-sm text-text-2">
          <input type="checkbox" checked={notifySla} onChange={(e) => setNotifySla(e.target.checked)} />
          Post a card on SLA breach
        </label>
        <label className="flex items-center gap-2 text-sm text-text-2">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Connection active
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="outline" disabled={testing} onClick={sendTest}>
          {testing ? "Sending…" : "Send test card"}
        </Button>
        <button type="button" onClick={() => setShowGuide((s) => !s)} className="ml-auto text-xs text-text-3 hover:text-text-2">
          {showGuide ? "Hide setup guide" : "Show setup guide"}
        </button>
      </div>

      {showGuide && (
        <div className="mt-3 space-y-2 rounded-control border border-border-2 bg-surface-2 p-3 text-xs text-text-2">
          <p><strong>Outbound (ticket updates → Teams):</strong> In the Teams channel, add a Workflow &ldquo;Post to a channel when a webhook request is received,&rdquo; copy its URL into &ldquo;Incoming Webhook / Workflow URL&rdquo; above.</p>
          <p><strong>Inbound (raise tickets from Teams):</strong> Channel ⋯ menu → Manage channel → Connectors → Outgoing Webhook. Name it <code>Objectra</code>, set the callback URL to <code>{"{APP_URL}"}/api/teams/inbound</code>, and paste the security token Teams generates into &ldquo;Outgoing Webhook HMAC secret&rdquo; above.</p>
          <p>Then in the channel: <code>@Objectra ticket MM p2 GRN failing for imported POs</code></p>
        </div>
      )}

      <div className="mt-4">
        <h4 className="text-xs font-medium text-text-2">Recent activity</h4>
        {log.length === 0 ? (
          <p className="mt-2 text-xs text-text-3">No events yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border text-xs">
            {log.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-text-3">{new Date(entry.occurred_at).toLocaleString()}</span>
                <span className="text-text-2">{entry.direction} · {entry.event}</span>
                <span style={{ color: entry.status === "ok" ? "var(--status-live)" : "var(--status-overdue)" }}>
                  {entry.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

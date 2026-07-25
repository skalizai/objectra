"use client";

// A known Next.js router-internals crash can leave the client router
// corrupted after certain navigations — a full document reload is the
// only reliable fix. This module is the single place that (a) reports a
// crash to the server so it can be diagnosed from `vercel logs` without
// needing a user to copy text out of DevTools, and (b) reloads, guarded
// by a short timestamp window so a genuinely broken destination can't
// reload-loop forever.
const GUARD_KEY = "objectra:last-auto-reload";
const GUARD_WINDOW_MS = 4000;

export interface ClientErrorInfo {
  message: string;
  stack?: string;
  source: string;
  digest?: string;
}

export function reportClientError(info: ClientErrorInfo) {
  try {
    void fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...info,
        url: window.location.href,
        userAgent: navigator.userAgent,
        time: new Date().toISOString(),
      }),
      keepalive: true,
    });
  } catch {
    // Best effort — never let reporting itself throw.
  }
}

export function reportAndMaybeReload(info: ClientErrorInfo) {
  reportClientError(info);
  const last = Number(sessionStorage.getItem(GUARD_KEY) ?? 0);
  const now = Date.now();
  if (now - last > GUARD_WINDOW_MS) {
    sessionStorage.setItem(GUARD_KEY, String(now));
    window.location.reload();
  }
}

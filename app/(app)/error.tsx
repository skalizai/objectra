"use client";

import { useEffect } from "react";

// A known Next.js router-internals crash (seen with certain client-side
// navigations, including auth redirects from proxy.ts) can leave the
// client router in a state that React's reset() can't recover from — a
// full document reload is the only reliable fix. Auto-reload once per
// crash; the timestamp guard stops a genuinely broken destination from
// reload-looping forever while still auto-recovering separate crashes.
const GUARD_KEY = "objectra:last-auto-reload";
const GUARD_WINDOW_MS = 4000;

export default function AppError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
    const last = Number(sessionStorage.getItem(GUARD_KEY) ?? 0);
    const now = Date.now();
    if (now - last > GUARD_WINDOW_MS) {
      sessionStorage.setItem(GUARD_KEY, String(now));
      window.location.reload();
    }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm text-text-2">Something went wrong loading this page.</p>
      <button
        onClick={() => {
          sessionStorage.removeItem(GUARD_KEY);
          window.location.reload();
        }}
        className="rounded-control border border-border-2 px-4 py-2 text-sm text-text hover:border-brass hover:text-brass"
      >
        Reload page
      </button>
    </div>
  );
}

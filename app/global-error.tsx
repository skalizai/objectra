"use client";

import { useEffect } from "react";

// Catches crashes outside app/(app)/error.tsx's reach (e.g. the root
// layout itself). Replaces the whole document when triggered, so it can't
// rely on globals.css having loaded — kept self-contained with inline
// styles. Same auto-reload rationale as app/(app)/error.tsx.
const GUARD_KEY = "objectra:last-auto-reload";
const GUARD_WINDOW_MS = 4000;

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          background: "#0e1116",
          color: "#e6e9ee",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        <p style={{ fontSize: 14, color: "#a6adb8" }}>Something went wrong.</p>
        <button
          onClick={() => {
            sessionStorage.removeItem(GUARD_KEY);
            window.location.reload();
          }}
          style={{
            borderRadius: 10,
            border: "1px solid #3a4048",
            background: "transparent",
            color: "#e6e9ee",
            padding: "8px 16px",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Reload page
        </button>
      </body>
    </html>
  );
}

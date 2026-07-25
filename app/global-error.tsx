"use client";

import { useEffect } from "react";
import { reportAndMaybeReload } from "@/lib/client-error-reporting";

// Catches crashes outside app/(app)/error.tsx's reach (e.g. the root
// layout itself). Replaces the whole document when triggered, so it can't
// rely on globals.css having loaded — kept self-contained with inline
// styles. Same auto-reload rationale as app/(app)/error.tsx.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
    reportAndMaybeReload({
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      source: "global-error-boundary",
    });
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
          onClick={() => window.location.reload()}
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

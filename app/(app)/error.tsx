"use client";

import { useEffect } from "react";
import { reportAndMaybeReload } from "@/lib/client-error-reporting";

export default function AppError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
    reportAndMaybeReload({
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      source: "app-error-boundary",
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm text-text-2">Something went wrong loading this page.</p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-control border border-border-2 px-4 py-2 text-sm text-text hover:border-brass hover:text-brass"
      >
        Reload page
      </button>
    </div>
  );
}

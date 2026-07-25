"use client";

import { useEffect } from "react";
import { reportAndMaybeReload } from "@/lib/client-error-reporting";

/** Catches what React error boundaries can't: errors thrown inside event
 * handlers (e.g. a Link click triggering the router) and unhandled
 * promise rejections (the router's navigation code is async). Mounted
 * once at the root so it's active on every route, signed in or not. */
export function GlobalErrorListener() {
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      reportAndMaybeReload({
        message: event.message || "window error",
        stack: event.error?.stack,
        source: "window.onerror",
      });
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const reason = event.reason as unknown;
      reportAndMaybeReload({
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        source: "unhandledrejection",
      });
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}

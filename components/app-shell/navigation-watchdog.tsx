"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/client-error-reporting";

const STALL_TIMEOUT_MS = 6000;

/** No JS error was ever thrown for the router-internals crash users have
 * hit in production (confirmed: /api/client-error received nothing for a
 * reproduced crash) — meaning it's a stall, not an exception. There's
 * nothing for an error boundary or window.onerror to catch. This watches
 * every internal link click and, if the URL hasn't actually changed
 * within STALL_TIMEOUT_MS, forces a real browser navigation instead of
 * leaving the page stuck blank until the user notices and refreshes. */
export function NavigationWatchdog() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      const startPathname = window.location.pathname;
      const targetHref = url.pathname + url.search + url.hash;

      window.setTimeout(() => {
        if (document.hidden) return; // tab backgrounded — not a stall
        if (window.location.pathname === startPathname) {
          reportClientError({
            message: `navigation stalled: ${startPathname} -> ${targetHref}`,
            source: "navigation-watchdog",
          });
          window.location.assign(targetHref);
        }
      }, STALL_TIMEOUT_MS);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}

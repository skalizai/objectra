"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const IDLE_MS = 15 * 60 * 1000;
const CHECK_INTERVAL_MS = 15 * 1000;
const ACTIVITY_WRITE_THROTTLE_MS = 5 * 1000;
const STORAGE_KEY = "objectra:last-activity";
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"] as const;

/** Signs the user out and returns them to the marketing homepage after 15
 * minutes with no activity anywhere in the app. Activity is timestamped in
 * localStorage, not just component state, so every open tab shares one
 * idle clock -- working in one tab keeps a dashboard open in another alive
 * too, and walking away logs every tab out together instead of only the
 * one that happened to be focused. */
export function IdleLogout() {
  const router = useRouter();
  const loggedOutRef = useRef(false);
  const lastWriteRef = useRef(0);

  useEffect(() => {
    function markActive() {
      const now = Date.now();
      if (now - lastWriteRef.current < ACTIVITY_WRITE_THROTTLE_MS) return;
      lastWriteRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY, String(now));
      } catch {
        // Storage unavailable (private mode, blocked) -- this tab just
        // won't share its activity with others; checkIdle() below still
        // works off whatever was last written (or "now" as a safe default).
      }
    }

    markActive();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActive, { passive: true });
    }

    async function checkIdle() {
      if (loggedOutRef.current) return;
      let last = Date.now();
      try {
        last = Number(localStorage.getItem(STORAGE_KEY)) || Date.now();
      } catch {
        // fall back to "just active" if storage can't be read
      }
      if (Date.now() - last < IDLE_MS) return;

      loggedOutRef.current = true;
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    }

    const interval = setInterval(checkIdle, CHECK_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActive);
      }
    };
  }, [router]);

  return null;
}

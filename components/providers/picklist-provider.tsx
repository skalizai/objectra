"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PicklistBundle } from "@/lib/data/picklists";

const PicklistContext = createContext<PicklistBundle | null>(null);

export function PicklistProvider({
  bundle,
  children,
}: {
  bundle: PicklistBundle;
  children: ReactNode;
}) {
  return <PicklistContext.Provider value={bundle}>{children}</PicklistContext.Provider>;
}

function usePicklists(): PicklistBundle {
  const ctx = useContext(PicklistContext);
  if (!ctx) throw new Error("usePicklists must be used within a PicklistProvider");
  return ctx;
}

export function useModules() {
  return usePicklists().modules;
}

export function useComplexities() {
  return usePicklists().complexities;
}

export function useCompanyCodes() {
  return usePicklists().companyCodes;
}

export function useStreams() {
  return usePicklists().streams;
}

export function useStatuses() {
  return usePicklists().statuses;
}

const FALLBACK_COLOR = "var(--status-process-pending)";

/** Resolves a status value to its admin-configured label/colour, falling
 * back gracefully for values that predate the current picklist (e.g. an
 * imported row whose status text doesn't match any active entry). */
export function useStatusMeta(status: string) {
  const statuses = useStatuses();
  return useMemo(() => {
    const match = statuses.find((s) => s.value === status);
    return {
      label: match?.value ?? status,
      colorVar: match?.color ?? FALLBACK_COLOR,
      isDone: match?.is_done ?? false,
    };
  }, [statuses, status]);
}

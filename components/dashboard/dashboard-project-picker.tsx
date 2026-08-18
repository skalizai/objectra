"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DashboardProjectPicker({
  projects,
  selectedId,
}: {
  projects: { id: string; name: string }[];
  selectedId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local, optimistic value -- a plain `value={selectedId}` controlled by
  // the server-provided prop snaps back to the old selection the instant
  // React re-renders with stale props, before router.push()'s data fetch
  // resolves (this is what read as "unresponsive"/"takes time" -- the
  // native <select> shows the click immediately, then the controlled
  // value yanks it back). Tracking the choice locally keeps the dropdown
  // showing what was just picked throughout the navigation.
  const [value, setValue] = useState(selectedId);
  const [prevSelectedId, setPrevSelectedId] = useState(selectedId);
  if (selectedId !== prevSelectedId) {
    setPrevSelectedId(selectedId);
    setValue(selectedId);
  }

  return (
    <select
      value={value}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        startTransition(() => {
          router.push(next === "all" ? "/dashboard" : `/dashboard?project=${next}`);
        });
      }}
      className="h-9 rounded-control border border-border-2 bg-surface-2 px-2.5 text-sm text-text focus:border-brass focus-visible:outline-none disabled:opacity-60"
    >
      <option value="all">All projects</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  );
}

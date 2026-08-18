"use client";

import { useRouter } from "next/navigation";

export function DashboardProjectPicker({
  projects,
  selectedId,
}: {
  projects: { id: string; name: string }[];
  selectedId: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedId}
      onChange={(e) => {
        const value = e.target.value;
        router.push(value === "all" ? "/dashboard" : `/dashboard?project=${value}`);
      }}
      className="h-9 rounded-control border border-border-2 bg-surface-2 px-2.5 text-sm text-text focus:border-brass focus-visible:outline-none"
    >
      <option value="all">All projects</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  );
}

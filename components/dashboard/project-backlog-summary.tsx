"use client";

import { useState } from "react";
import { BacklogDashboard } from "@/components/backlog/backlog-dashboard";
import type { BacklogItem, BacklogPackage } from "@/lib/types/database";

/** Owns the Package-filter state locally so BacklogDashboard (a controlled
 * component elsewhere driven by backlog-register.tsx) can be embedded
 * standalone on the portfolio dashboard's per-project summary. */
export function ProjectBacklogSummary({ items }: { items: BacklogItem[] }) {
  const [packageFilter, setPackageFilter] = useState<BacklogPackage | "all">("all");
  return <BacklogDashboard items={items} packageFilter={packageFilter} onPackageFilterChange={setPackageFilter} />;
}

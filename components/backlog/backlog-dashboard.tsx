"use client";

import { useMemo } from "react";
import { BacklogCategoryDonut, type CategorySlice } from "@/components/backlog/backlog-category-donut";
import { BacklogEffortTypeBar, type EffortTypeDatum } from "@/components/backlog/backlog-effort-type-bar";
import { BacklogModuleDaysBar, type ModuleDaysDatum } from "@/components/backlog/backlog-module-days-bar";
import { BACKLOG_PACKAGES, type BacklogItem, type BacklogPackage } from "@/lib/types/database";

// Validated against Objectra's dark chart surface (#161B22) via the
// dataviz skill's validate_palette.js -- all 8 slots clear the
// lightness/chroma/CVD/contrast gates in the app's one (dark-only) theme.
// Fixed order, never cycled or re-ranked per filter -- see buildRankedColorMap.
const CATEGORICAL = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];
const OTHER_COLOR = "#7A8492"; // neutral -- matches the app's existing "Process/Pending"/P4 muted tone
const NOT_SET = "Not set";
const MAX_VISIBLE_SLICES = 8;

/** Module/LOB/Type are open-ended nominal fields -- color is assigned once
 * from the full (unfiltered) item set's frequency ranking, in fixed slot
 * order, then reused verbatim for any filtered view. This is what keeps a
 * category's color from repainting when the Package selector changes which
 * slices are visible (dataviz non-negotiable: "color follows the entity,
 * never its rank"). Values beyond the top 8 by overall frequency always
 * fold into the same neutral "Other" bucket, in both the full and
 * filtered views. */
function buildRankedColorMap(allValues: string[]): Map<string, string> {
  const counts = new Map<string, number>();
  for (const v of allValues) counts.set(v, (counts.get(v) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const map = new Map<string, string>();
  ranked.slice(0, MAX_VISIBLE_SLICES).forEach((key, i) => map.set(key, CATEGORICAL[i]));
  return map;
}

function toSlices(values: string[], colorMap: Map<string, string>): CategorySlice[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);

  const known: CategorySlice[] = [];
  let otherCount = 0;
  for (const [label, count] of counts.entries()) {
    const color = colorMap.get(label);
    if (color) known.push({ label, count, color });
    else otherCount += count;
  }
  known.sort((a, b) => b.count - a.count);
  if (otherCount > 0) known.push({ label: "Other", count: otherCount, color: OTHER_COLOR });
  return known;
}

function splitLob(lob: string | null): string[] {
  if (!lob || !lob.trim()) return [NOT_SET];
  return lob.split(",").map((s) => s.trim()).filter(Boolean);
}

// Package is a small, fixed, known-in-advance set -- assigned a fixed slot
// per value (declaration order), not frequency-ranked, same reasoning
// ticket-status-donut.tsx uses a hardcoded per-status color map instead of
// ranking statuses by count.
const PACKAGE_COLOR: Record<string, string> = Object.fromEntries(
  BACKLOG_PACKAGES.map((p, i) => [p, CATEGORICAL[i]]),
);

export function BacklogDashboard({
  items,
  packageFilter,
  onPackageFilterChange,
}: {
  items: BacklogItem[];
  packageFilter: BacklogPackage | "all";
  onPackageFilterChange: (value: BacklogPackage | "all") => void;
}) {
  // Color maps are built once from the FULL item set, independent of the
  // package selector, so a value's color never changes as the selector
  // moves between "All packages" and a specific one.
  const moduleColorMap = useMemo(() => buildRankedColorMap(items.map((i) => i.module || NOT_SET)), [items]);
  const lobColorMap = useMemo(() => buildRankedColorMap(items.flatMap((i) => splitLob(i.lob))), [items]);
  const typeColorMap = useMemo(() => buildRankedColorMap(items.map((i) => i.dev_type || NOT_SET)), [items]);

  const scoped = useMemo(
    () => (packageFilter === "all" ? items : items.filter((i) => i.package === packageFilter)),
    [items, packageFilter],
  );

  const moduleSlices = useMemo(() => toSlices(scoped.map((i) => i.module || NOT_SET), moduleColorMap), [scoped, moduleColorMap]);
  const lobSlices = useMemo(() => toSlices(scoped.flatMap((i) => splitLob(i.lob)), lobColorMap), [scoped, lobColorMap]);
  const typeSlices = useMemo(() => toSlices(scoped.map((i) => i.dev_type || NOT_SET), typeColorMap), [scoped, typeColorMap]);

  const effortTypeData = useMemo<EffortTypeDatum[]>(() => {
    const dev = scoped.reduce((sum, i) => sum + i.dev_days, 0);
    const fiori = scoped.reduce((sum, i) => sum + i.fiori_days, 0);
    const func = scoped.reduce((sum, i) => sum + i.func_days, 0);
    return [
      { type: "Dev", days: Math.round(dev * 10) / 10 },
      { type: "Fiori", days: Math.round(fiori * 10) / 10 },
      { type: "Functional", days: Math.round(func * 10) / 10 },
    ];
  }, [scoped]);

  const moduleDaysData = useMemo<ModuleDaysDatum[]>(() => {
    const totals = new Map<string, number>();
    for (const item of scoped) {
      const key = item.module || NOT_SET;
      const days = item.dev_days + item.fiori_days + item.func_days;
      totals.set(key, (totals.get(key) ?? 0) + days);
    }
    return [...totals.entries()]
      .map(([module, days]) => ({ module, days: Math.round(days * 10) / 10 }))
      .sort((a, b) => b.days - a.days);
  }, [scoped]);

  // Scoped like every other card, for consistency -- picking a package
  // narrows this to just that one slice (trivial, but predictable: every
  // card on the dashboard reacts to the selector the same way).
  const packageSlices = useMemo<CategorySlice[]>(() => {
    const counts = new Map<string, number>();
    for (const item of scoped) {
      const key = item.package ?? "Unassigned";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count, color: PACKAGE_COLOR[label] ?? OTHER_COLOR }));
  }, [scoped]);

  const selectClass =
    "h-10 rounded-control border border-border-2 bg-surface-2 px-3 text-sm text-text focus:border-brass focus-visible:outline-none";

  return (
    <div className="space-y-4 pb-2">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="package-scope" className="text-sm font-medium text-text-2">
          Package
        </label>
        <select
          id="package-scope"
          value={packageFilter}
          onChange={(e) => onPackageFilterChange(e.target.value as BacklogPackage | "all")}
          className={selectClass}
        >
          <option value="all">All packages</option>
          {BACKLOG_PACKAGES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <span className="text-xs text-text-3">
          {packageFilter === "all" ? `${items.length} items across every package` : `${scoped.length} items in ${packageFilter}`}
        </span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <BacklogCategoryDonut title="By module" caption={packageFilter === "all" ? undefined : `Scoped to ${packageFilter}`} data={moduleSlices} totalLabel="items" delay={0.06} />
        <BacklogCategoryDonut title="By LOB" caption={packageFilter === "all" ? undefined : `Scoped to ${packageFilter}`} data={lobSlices} totalLabel="tags" delay={0.12} />
        <BacklogCategoryDonut title="By type" caption={packageFilter === "all" ? undefined : `Scoped to ${packageFilter}`} data={typeSlices} totalLabel="items" delay={0.18} />
        <BacklogCategoryDonut title="By package" caption={packageFilter === "all" ? undefined : `Scoped to ${packageFilter}`} data={packageSlices} totalLabel="items" delay={0.24} />
        <BacklogEffortTypeBar data={effortTypeData} caption={packageFilter === "all" ? undefined : `Scoped to ${packageFilter}`} delay={0.3} />
        <BacklogModuleDaysBar data={moduleDaysData} caption={packageFilter === "all" ? undefined : `Scoped to ${packageFilter}`} delay={0.36} />
      </div>
    </div>
  );
}

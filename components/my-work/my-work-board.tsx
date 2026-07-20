"use client";

import { differenceInCalendarDays } from "date-fns";
import { MyWorkCard } from "@/components/my-work/my-work-card";
import { useStatuses } from "@/components/providers/picklist-provider";
import { isDoneStatus } from "@/lib/object-meta";
import type { MyWorkItem } from "@/lib/data/my-work";
import type { Picklist } from "@/lib/types/database";

function bucketOf(item: MyWorkItem, statuses: Pick<Picklist, "value" | "is_done">[]): string {
  if (isDoneStatus(item.status, statuses)) return "Done";
  if (!item.due_date) return "No due date";
  const days = differenceInCalendarDays(new Date(item.due_date), new Date());
  if (days < 0) return "Overdue";
  if (days <= 7) return "Due this week";
  return "Due later";
}

const ORDER = ["Overdue", "Due this week", "Due later", "No due date", "Done"];

export function MyWorkBoard({ items }: { items: MyWorkItem[] }) {
  const statuses = useStatuses();
  const groups = new Map<string, MyWorkItem[]>();
  for (const item of items) {
    const bucket = bucketOf(item, statuses);
    groups.set(bucket, [...(groups.get(bucket) ?? []), item]);
  }

  const nonEmpty = ORDER.filter((bucket) => (groups.get(bucket)?.length ?? 0) > 0);

  if (nonEmpty.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border-2 py-24 text-center">
        <h2 className="font-display text-lg font-semibold">No objects assigned yet</h2>
        <p className="mt-2 max-w-sm text-sm text-text-2">
          Once a project manager assigns you to an object, it&apos;ll show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {nonEmpty.map((bucket) => (
        <div key={bucket}>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-text-2">
            {bucket}
            <span className="font-mono text-xs text-text-3">{groups.get(bucket)!.length}</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.get(bucket)!.map((item, i) => (
              <MyWorkCard key={item.id} item={item} index={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

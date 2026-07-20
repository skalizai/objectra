import type { Metadata } from "next";
import { getMyWork } from "@/lib/data/my-work";
import { MyWorkBoard } from "@/components/my-work/my-work-board";

export const metadata: Metadata = { title: "My work" };

export default async function MyWorkPage() {
  const items = await getMyWork();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">My work</h1>
        <p className="mt-1 text-sm text-text-2">Objects assigned to you, grouped by urgency.</p>
      </div>
      <MyWorkBoard items={items} />
    </div>
  );
}

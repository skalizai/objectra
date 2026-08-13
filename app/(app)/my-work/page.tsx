import type { Metadata } from "next";
import { getMyWork } from "@/lib/data/my-work";
import { getMyTickets } from "@/lib/data/support";
import { getViewer } from "@/lib/auth/get-viewer";
import { MyWorkBoard } from "@/components/my-work/my-work-board";
import { MyTicketsList } from "@/components/support/my-tickets-list";

export const metadata: Metadata = { title: "My work" };

export default async function MyWorkPage() {
  const [viewer, items, tickets] = await Promise.all([getViewer(), getMyWork(), getMyTickets()]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">My work</h1>
        <p className="mt-1 text-sm text-text-2">Objects assigned to you, grouped by urgency.</p>
      </div>
      <MyWorkBoard items={items} />

      {tickets.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-text-2">
            My tickets
            <span className="font-mono text-xs text-text-3">{tickets.length}</span>
          </h2>
          <MyTicketsList tickets={tickets} viewerId={viewer?.user.id ?? ""} />
        </div>
      )}
    </div>
  );
}

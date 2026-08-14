import type { Metadata } from "next";
import { getViewer } from "@/lib/auth/get-viewer";
import { getMyTickets } from "@/lib/data/support";
import { getPicklists } from "@/lib/data/picklists";
import { createClient } from "@/lib/supabase/server";
import { MyTicketsList } from "@/components/support/my-tickets-list";
import { RaiseTicketForm } from "@/components/support/raise-ticket-form";

export const metadata: Metadata = { title: "My tickets" };

export default async function MyTicketsPage() {
  const viewer = await getViewer();
  if (!viewer) return null;

  const superUserProjectIds = Object.entries(viewer.projectRoles)
    .filter(([, role]) => role === "super_user")
    .map(([projectId]) => projectId);

  const [tickets, picklists, supabase] = await Promise.all([
    getMyTickets(),
    getPicklists(viewer.profile.org_id),
    createClient(),
  ]);

  const { data: allProjects } = superUserProjectIds.length
    ? await supabase.from("projects").select("id, name, phase").in("id", superUserProjectIds)
    : { data: [] as { id: string; name: string; phase: string }[] };
  // Ticket creation is only allowed once a project is in hypercare/support
  // (tickets_insert RLS policy) — don't offer a raise button that would
  // just fail.
  const projects = (allProjects ?? []).filter((p) => p.phase === "hypercare" || p.phase === "support");

  const open = tickets.filter((t) => !["resolved", "closed"].includes(t.status));
  const resolved = tickets.filter((t) => ["resolved", "closed"].includes(t.status));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">My tickets</h1>
          <p className="mt-1 text-sm text-text-2">Incidents you&apos;ve raised.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {projects.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              {projects.length > 1 && <span className="text-xs text-text-3">{p.name}</span>}
              <RaiseTicketForm projectId={p.id} modules={picklists.modules.map((m) => m.value)} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-text-2">
          Open
          <span className="font-mono text-xs text-text-3">{open.length}</span>
        </h2>
        <MyTicketsList tickets={open} viewerId={viewer.user.id} />
      </div>

      {resolved.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-text-2">
            Resolved / closed
            <span className="font-mono text-xs text-text-3">{resolved.length}</span>
          </h2>
          <MyTicketsList tickets={resolved} viewerId={viewer.user.id} />
        </div>
      )}
    </div>
  );
}

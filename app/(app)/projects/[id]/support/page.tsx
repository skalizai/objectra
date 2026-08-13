import { getViewer } from "@/lib/auth/get-viewer";
import { isProjectEditorRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { getProjectTickets, getSupportDashboardData } from "@/lib/data/support";
import { getPicklists } from "@/lib/data/picklists";
import { TicketKpiRow } from "@/components/support/ticket-kpi-row";
import { TicketStatusDonut } from "@/components/support/ticket-status-donut";
import { TicketCriticalityBar } from "@/components/support/ticket-criticality-bar";
import { TicketAgingBuckets } from "@/components/support/ticket-aging-buckets";
import { TicketsTable } from "@/components/support/tickets-table";
import { RaiseTicketForm } from "@/components/support/raise-ticket-form";

export default async function SupportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) return null;

  const canManage = viewer.role === "org_admin" || isProjectEditorRole(viewer.projectRoles[id]);
  const canRaise = canManage || viewer.projectRoles[id] === "super_user";

  const supabase = await createClient();
  const [dashboard, tickets, picklists, { data: objects }, { data: memberRows }] = await Promise.all([
    getSupportDashboardData(id),
    getProjectTickets(id),
    getPicklists(viewer.profile.org_id),
    supabase.from("objects").select("id, title, wricef_id").eq("project_id", id).order("title"),
    supabase
      .from("project_members")
      .select("profile:profiles(id, full_name)")
      .eq("project_id", id)
      .eq("is_active", true)
      .in("role", ["member", "technical_lead", "project_manager"]),
  ]);

  const consultantOptions = (
    (memberRows ?? []) as unknown as { profile: { id: string; full_name: string } | null }[]
  )
    .map((m) => m.profile)
    .filter((p): p is { id: string; full_name: string } => !!p);

  return (
    <div className="space-y-6 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Support</h2>
          <p className="mt-1 text-sm text-text-2">Hypercare ticket routing, SLA tracking, and the support queue.</p>
        </div>
        {canRaise && (
          <RaiseTicketForm
            projectId={id}
            modules={picklists.modules.map((m) => m.value)}
            objectOptions={objects ?? []}
          />
        )}
      </div>

      <TicketKpiRow kpis={dashboard.kpis} />

      <div className="grid gap-5 lg:grid-cols-2">
        <TicketStatusDonut data={dashboard.statusDistribution} />
        <TicketCriticalityBar data={dashboard.byCriticality} />
      </div>

      <TicketAgingBuckets data={dashboard.agingBuckets} />

      <TicketsTable
        projectId={id}
        tickets={tickets}
        viewerId={viewer.user.id}
        canManage={canManage}
        consultantOptions={consultantOptions}
      />
    </div>
  );
}

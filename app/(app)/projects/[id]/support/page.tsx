import { getViewer } from "@/lib/auth/get-viewer";
import { isProjectEditorRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { getProjectTickets, getSupportDashboardData } from "@/lib/data/support";
import { getPicklists } from "@/lib/data/picklists";
import { TicketKpiRow } from "@/components/support/ticket-kpi-row";
import { TicketStatusDonut } from "@/components/support/ticket-status-donut";
import { TicketCriticalityBar } from "@/components/support/ticket-criticality-bar";
import { TicketModuleBar } from "@/components/support/ticket-module-bar";
import { TicketAgingBuckets } from "@/components/support/ticket-aging-buckets";
import { TicketWorkload } from "@/components/support/ticket-workload";
import { TicketTopRaisers } from "@/components/support/ticket-top-raisers";
import { TicketDeadlineMonitor } from "@/components/support/ticket-deadline-monitor";
import { TicketsTable } from "@/components/support/tickets-table";
import { RaiseTicketForm } from "@/components/support/raise-ticket-form";

export default async function SupportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) return null;

  const canManage = viewer.role === "org_admin" || isProjectEditorRole(viewer.projectRoles[id]);

  const supabase = await createClient();
  const [dashboard, tickets, picklists, { data: project }, { data: resourceRows }] = await Promise.all([
    getSupportDashboardData(id),
    getProjectTickets(id),
    getPicklists(viewer.profile.org_id),
    supabase.from("projects").select("phase").eq("id", id).maybeSingle(),
    // Reassign offers the full org roster, invited or not (section 24) —
    // reassignTicket() itself resolves resource -> profile and returns a
    // clear message if that resource hasn't accepted their invite yet,
    // rather than restricting the picker to already-invited project
    // members the way it used to.
    supabase
      .from("resources")
      .select("id, full_name, profile_id, consultant_type")
      .eq("org_id", viewer.profile.org_id)
      .order("full_name"),
  ]);

  const ticketsEnabled = project?.phase === "hypercare" || project?.phase === "support";
  const canRaise = ticketsEnabled && (canManage || viewer.projectRoles[id] === "super_user");

  const consultantOptions = resourceRows ?? [];
  const functionalConsultants = consultantOptions.filter((r) => (r.consultant_type ?? "").trim().toLowerCase() === "functional");
  const technicalConsultants = consultantOptions.filter((r) => (r.consultant_type ?? "").trim().toLowerCase() === "technical");

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
            isManager={canManage}
            functionalConsultants={functionalConsultants}
            technicalConsultants={technicalConsultants}
          />
        )}
      </div>

      {!ticketsEnabled && canManage && (
        <div
          className="rounded-control border px-3 py-2.5 text-sm"
          style={{ borderColor: "var(--brass)", color: "var(--text-2)" }}
        >
          Ticket creation is off until this project is in Hypercare or Support phase — flip it from{" "}
          <a href={`/settings?project=${id}`} className="underline" style={{ color: "var(--brass)" }}>
            Settings
          </a>
          .
        </div>
      )}

      <TicketKpiRow kpis={dashboard.kpis} />

      <div className="grid gap-5 lg:grid-cols-2">
        <TicketStatusDonut data={dashboard.statusDistribution} />
        <TicketCriticalityBar data={dashboard.byCriticality} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <TicketModuleBar data={dashboard.byModule} />
        <TicketAgingBuckets data={dashboard.agingBuckets} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <TicketWorkload data={dashboard.workload} />
        <TicketTopRaisers data={dashboard.topRaisers} />
      </div>

      <TicketDeadlineMonitor data={dashboard.upcomingDeadlines} />

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

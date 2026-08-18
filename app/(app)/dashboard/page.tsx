import type { Metadata } from "next";
import Link from "next/link";
import { getDashboardData } from "@/lib/data/dashboard";
import { getBacklogItems } from "@/lib/data/backlog";
import { getSupportDashboardData } from "@/lib/data/support";
import { getViewer } from "@/lib/auth/get-viewer";
import { createClient } from "@/lib/supabase/server";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { StatusDonut } from "@/components/dashboard/status-donut";
import { ModuleBar } from "@/components/dashboard/module-bar";
import { ProjectProgress } from "@/components/dashboard/project-progress";
import { DeadlineMonitor } from "@/components/dashboard/deadline-monitor";
import { DashboardProjectPicker } from "@/components/dashboard/dashboard-project-picker";
import { ProjectBacklogSummary } from "@/components/dashboard/project-backlog-summary";
import { Button } from "@/components/ui/button";
import { TicketKpiRow } from "@/components/support/ticket-kpi-row";
import { TicketStatusDonut } from "@/components/support/ticket-status-donut";
import { TicketCriticalityBar } from "@/components/support/ticket-criticality-bar";
import { TicketModuleBar } from "@/components/support/ticket-module-bar";
import { TicketAgingBuckets } from "@/components/support/ticket-aging-buckets";
import { TicketWorkload } from "@/components/support/ticket-workload";
import { TicketTopRaisers } from "@/components/support/ticket-top-raisers";
import { TicketDeadlineMonitor } from "@/components/support/ticket-deadline-monitor";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const [viewer, { project: projectParam }] = await Promise.all([getViewer(), searchParams]);
  const data = await getDashboardData(viewer!.profile.org_id, projectParam);

  // Only trust the query param if it actually names a project this viewer
  // can see (getDashboardData's `projects` list is already RLS-scoped) --
  // an unknown/foreign id just falls back to the portfolio-wide view.
  const selectedProject = projectParam ? data.projects.find((p) => p.id === projectParam) : undefined;
  const selectedProjectId = selectedProject?.id;

  const heading = viewer?.role === "org_admin" ? "Portfolio dashboard" : "Project dashboard";
  const subtitle = selectedProject
    ? `Delivery, backlog, and support status for ${selectedProject.name}.`
    : viewer?.role === "org_admin"
      ? "Delivery, backlog, and support status across every active project."
      : "Delivery, backlog, and support status across the projects you manage.";

  if (data.projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border-2 py-24 text-center">
        <h1 className="font-display text-xl font-semibold">No projects yet</h1>
        <p className="mt-2 max-w-sm text-sm text-text-2">
          Create your first project to start tracking development objects.
        </p>
        <Link href="/projects" className="mt-6">
          <Button>Create a project</Button>
        </Link>
      </div>
    );
  }

  // Backlog/Support aggregate across every visible project when no single
  // project is selected -- same "all projects" default the top KPI/status/
  // module charts already use, just extended to these two sections instead
  // of only appearing once a project is picked.
  const supabase = await createClient();
  const [backlogItems, supportDashboard, projectRow] = await Promise.all([
    getBacklogItems(selectedProjectId),
    getSupportDashboardData(selectedProjectId),
    selectedProjectId
      ? supabase.from("projects").select("phase").eq("id", selectedProjectId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const ticketsEnabled = selectedProjectId
    ? projectRow.data?.phase === "hypercare" || projectRow.data?.phase === "support"
    : true;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{heading}</h1>
          <p className="mt-1 text-sm text-text-2">{subtitle}</p>
        </div>
        <DashboardProjectPicker
          projects={data.projects.map((p) => ({ id: p.id, name: p.name }))}
          selectedId={selectedProjectId ?? "all"}
        />
      </div>

      <KpiRow kpis={data.kpis} />

      <div className="grid gap-5 lg:grid-cols-2">
        <StatusDonut data={data.statusDistribution} />
        <ModuleBar data={data.byModule} />
        <ProjectProgress data={data.projectProgress} statusAccents={data.statusAccents} />
        <DeadlineMonitor data={data.deadlineMonitor} />
      </div>

      <div className="space-y-4 border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Backlog</h2>
            <p className="mt-1 text-sm text-text-2">
              Registration & approval status {selectedProject ? `for ${selectedProject.name}` : "across every project"}.
            </p>
          </div>
          <Link
            href={selectedProjectId ? `/projects/${selectedProjectId}/backlog` : "/projects"}
            className="text-sm underline"
            style={{ color: "var(--brass)" }}
          >
            {selectedProjectId ? "Open Backlog tab →" : "Browse projects →"}
          </Link>
        </div>
        <ProjectBacklogSummary items={backlogItems} />
      </div>

      <div className="space-y-4 border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Support</h2>
            <p className="mt-1 text-sm text-text-2">
              Hypercare ticket status {selectedProject ? `for ${selectedProject.name}` : "across every project"}.
            </p>
          </div>
          <Link
            href={selectedProjectId ? `/projects/${selectedProjectId}/support` : "/projects"}
            className="text-sm underline"
            style={{ color: "var(--brass)" }}
          >
            {selectedProjectId ? "Open Support tab →" : "Browse projects →"}
          </Link>
        </div>

        {selectedProjectId && !ticketsEnabled && (
          <div
            className="rounded-control border px-3 py-2.5 text-sm"
            style={{ borderColor: "var(--brass)", color: "var(--text-2)" }}
          >
            This project isn&apos;t in Hypercare or Support phase yet, so there&apos;s no ticket activity below.
          </div>
        )}

        <TicketKpiRow kpis={supportDashboard.kpis} />
        <div className="grid gap-5 lg:grid-cols-2">
          <TicketStatusDonut data={supportDashboard.statusDistribution} />
          <TicketCriticalityBar data={supportDashboard.byCriticality} />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <TicketModuleBar data={supportDashboard.byModule} />
          <TicketAgingBuckets data={supportDashboard.agingBuckets} />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <TicketWorkload data={supportDashboard.workload} />
          <TicketTopRaisers data={supportDashboard.topRaisers} />
        </div>
        <TicketDeadlineMonitor data={supportDashboard.upcomingDeadlines} />
      </div>
    </div>
  );
}

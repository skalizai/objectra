import type { Metadata } from "next";
import Link from "next/link";
import { getDashboardData } from "@/lib/data/dashboard";
import { getViewer } from "@/lib/auth/get-viewer";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { StatusDonut } from "@/components/dashboard/status-donut";
import { ModuleBar } from "@/components/dashboard/module-bar";
import { WaveProgress } from "@/components/dashboard/wave-progress";
import { DeadlineMonitor } from "@/components/dashboard/deadline-monitor";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const viewer = await getViewer();
  const data = await getDashboardData(viewer!.profile.org_id);

  const heading = viewer?.role === "org_admin" ? "Portfolio dashboard" : "Project dashboard";
  const subtitle =
    viewer?.role === "org_admin"
      ? "Delivery status across every active project."
      : "Delivery status across the projects you manage.";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{heading}</h1>
        <p className="mt-1 text-sm text-text-2">{subtitle}</p>
      </div>

      <KpiRow kpis={data.kpis} />

      <div className="grid gap-5 lg:grid-cols-2">
        <StatusDonut data={data.statusDistribution} />
        <ModuleBar data={data.byModule} />
        <WaveProgress data={data.waveProgress} />
        <DeadlineMonitor data={data.deadlineMonitor} />
      </div>
    </div>
  );
}

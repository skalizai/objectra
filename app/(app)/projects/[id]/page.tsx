import { notFound } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getProjectById } from "@/lib/data/projects";
import { listObjectsForProject } from "@/lib/data/objects";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  under_approval: "Under Approval",
  closed: "Closed",
};

export default async function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, objects] = await Promise.all([getProjectById(id), listObjectsForProject(id)]);
  if (!project) notFound();

  let pmName = "Unassigned";
  if (project.pm_id) {
    const supabase = await createClient();
    const { data } = await supabase.from("resources").select("full_name").eq("id", project.pm_id).maybeSingle();
    pmName = data?.full_name ?? "Unassigned";
  }

  const fields: { label: string; value: string }[] = [
    { label: "Client", value: project.client_name },
    { label: "Project code", value: project.code },
    { label: "Status", value: STATUS_LABEL[project.status] ?? project.status },
    { label: "Project manager", value: pmName },
    {
      label: "Start date",
      value: project.start_date ? format(new Date(project.start_date), "dd MMM yyyy") : "—",
    },
    {
      label: "Target go-live",
      value: project.target_go_live ? format(new Date(project.target_go_live), "dd MMM yyyy") : "—",
    },
    { label: "Company code", value: project.company_code || "—" },
    { label: "Stream", value: project.stream || "—" },
  ];

  return (
    <div className="space-y-6 pt-5">
      <div className="rounded-card border border-border bg-surface p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h2 className="font-display text-sm font-semibold">Project details</h2>
        <p className="mt-1 text-xs text-text-3">
          Use &ldquo;Edit project&rdquo; above to change these — the company code and stream are what new
          objects in this project default to.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          {fields.map((f) => (
            <div key={f.label}>
              <dt className="text-xs text-text-3">{f.label}</dt>
              <dd className="mt-0.5 text-sm text-text">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-card border border-border bg-surface p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h2 className="font-display text-sm font-semibold">Objects</h2>
        <p className="mt-2 text-sm text-text-2">
          {objects.length} object{objects.length === 1 ? "" : "s"} in this project — see the Objects register tab
          for the full list.
        </p>
      </div>
    </div>
  );
}

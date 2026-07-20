import type { Metadata } from "next";
import { listProjects } from "@/lib/data/projects";
import { getViewer } from "@/lib/auth/get-viewer";
import { createClient } from "@/lib/supabase/server";
import { ProjectCard } from "@/components/projects/project-card";
import { CreateProjectButton } from "@/components/projects/create-project-button";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const [viewer, projects] = await Promise.all([getViewer(), listProjects()]);

  let pmOptions: { id: string; full_name: string }[] = [];
  if (viewer?.role === "org_admin") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("org_id", viewer.profile.org_id)
      .order("full_name");
    pmOptions = data ?? [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Projects</h1>
          <p className="mt-1 text-sm text-text-2">
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </p>
        </div>
        {viewer?.role === "org_admin" && <CreateProjectButton pmOptions={pmOptions} />}
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border-2 py-24 text-center">
          <h2 className="font-display text-lg font-semibold">No projects yet</h2>
          <p className="mt-2 max-w-sm text-sm text-text-2">
            {viewer?.role === "org_admin"
              ? "Create a project to start tracking development objects."
              : "You haven't been added to a project yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

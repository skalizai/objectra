import { notFound } from "next/navigation";
import { getProjectById } from "@/lib/data/projects";
import { getViewer } from "@/lib/auth/get-viewer";
import { isProjectEditorRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceTabs } from "@/components/projects/workspace-tabs";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import { EditProjectButton } from "@/components/projects/edit-project-button";

const STATUS_LABEL: Record<string, string> = { active: "Active", paused: "Paused", closed: "Closed" };

export default async function ProjectWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, viewer] = await Promise.all([getProjectById(id), getViewer()]);
  if (!project) notFound();

  const canEdit = viewer?.role === "org_admin" || isProjectEditorRole(viewer?.projectRoles[id]);

  let pmOptions: { id: string; full_name: string }[] = [];
  if (canEdit && viewer) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("resources")
      .select("id, full_name")
      .eq("org_id", viewer.profile.org_id)
      .order("full_name");
    pmOptions = data ?? [];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold">{project.name}</h1>
            <span className="rounded-full border border-border-2 px-2 py-0.5 font-mono text-xs text-text-3">
              {project.code}
            </span>
          </div>
          <p className="mt-1 text-sm text-text-2">
            {project.client_name} · {STATUS_LABEL[project.status]}
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <EditProjectButton project={project} pmOptions={pmOptions} />
            {viewer?.role === "org_admin" && (
              <DeleteProjectButton projectId={project.id} projectName={project.name} />
            )}
          </div>
        )}
      </div>

      <WorkspaceTabs projectId={project.id} />

      {children}
    </div>
  );
}

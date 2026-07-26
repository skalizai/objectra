import type { Metadata } from "next";
import { getViewer } from "@/lib/auth/get-viewer";
import { listResources } from "@/lib/data/resources";
import { listProjects } from "@/lib/data/projects";
import { ResourcesTable } from "@/components/resources/resources-table";
import { AddResourceButton } from "@/components/resources/add-resource-button";

export const metadata: Metadata = { title: "Resources" };

export default async function ResourcesPage() {
  const viewer = await getViewer();
  if (!viewer) return null;

  const [resources, projects] = await Promise.all([
    listResources(viewer.profile.org_id),
    listProjects(),
  ]);

  // Only org_admin can edit/invite/delete resources — PMs and technical
  // leads used to be able to as well, now roster changes are admin-only.
  const canManage = viewer.role === "org_admin";
  const overAllocatedCount = resources.filter((r) => r.overAllocated).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Resources</h1>
          <p className="mt-1 text-sm text-text-2">
            {resources.length} people
            {overAllocatedCount > 0 && (
              <span style={{ color: "var(--status-overdue)" }}> · {overAllocatedCount} over-allocated</span>
            )}
          </p>
        </div>
        {canManage && <AddResourceButton />}
      </div>

      {resources.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border-2 py-24 text-center">
          <h2 className="font-display text-lg font-semibold">No resources yet</h2>
          <p className="mt-2 max-w-sm text-sm text-text-2">Add resources to your roster to see them here.</p>
        </div>
      ) : (
        <ResourcesTable
          resources={resources}
          canInvite={canManage}
          projectOptions={projects.map((p) => ({ id: p.id, name: p.name }))}
        />
      )}
    </div>
  );
}

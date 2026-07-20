import type { Metadata } from "next";
import { getClientProjectStatuses } from "@/lib/data/client-view";
import { getViewer } from "@/lib/auth/get-viewer";
import { ClientProjectCard } from "@/components/client/client-project-card";

export const metadata: Metadata = { title: "Project status" };

export default async function ClientPage() {
  const viewer = await getViewer();
  const statuses = await getClientProjectStatuses(viewer!.profile.org_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Project status</h1>
        <p className="mt-1 text-sm text-text-2">A read-only view of progress on your project.</p>
      </div>

      {statuses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border-2 py-24 text-center">
          <h2 className="font-display text-lg font-semibold">No project status yet</h2>
          <p className="mt-2 max-w-sm text-sm text-text-2">
            Once your project has objects tracked, progress will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {statuses.map((status, i) => (
            <ClientProjectCard key={status.project.id} status={status} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

import {
  getAuditLogForProject,
  getResourcesForAssignment,
  listObjectsForProject,
} from "@/lib/data/objects";
import { getViewer } from "@/lib/auth/get-viewer";
import { AddObjectButton } from "@/components/objects/add-object-button";
import { DeadlineTiles } from "@/components/objects/deadline-tiles";
import { AssignmentsTable } from "@/components/objects/assignments-table";
import { AuditTrail } from "@/components/objects/audit-trail";

export default async function AssignmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  const [objects, resources, auditLog] = await Promise.all([
    listObjectsForProject(id),
    viewer ? getResourcesForAssignment(viewer.profile.org_id) : Promise.resolve([]),
    getAuditLogForProject(id),
  ]);

  return (
    <div className="space-y-6 pt-5">
      <DeadlineTiles objects={objects} />

      <div className="flex justify-end">
        <AddObjectButton projectId={id} />
      </div>

      <AssignmentsTable projectId={id} objects={objects} resources={resources} />

      <AuditTrail entries={auditLog} />
    </div>
  );
}

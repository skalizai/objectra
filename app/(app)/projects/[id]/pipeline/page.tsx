import { listObjectsForProject, getResourcesForAssignment } from "@/lib/data/objects";
import { getViewer } from "@/lib/auth/get-viewer";
import { isProjectEditorRole } from "@/lib/auth/permissions";
import { PipelineBoard } from "@/components/objects/pipeline-board";

export default async function PipelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  const [objects, resources] = await Promise.all([
    listObjectsForProject(id),
    viewer ? getResourcesForAssignment(viewer.profile.org_id) : Promise.resolve([]),
  ]);
  const canEdit = viewer?.role === "org_admin" || isProjectEditorRole(viewer?.projectRoles[id]);

  return <PipelineBoard projectId={id} objects={objects} canEdit={!!canEdit} resources={resources} />;
}

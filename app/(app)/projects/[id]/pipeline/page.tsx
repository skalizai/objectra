import { listObjectsForProject } from "@/lib/data/objects";
import { getViewer } from "@/lib/auth/get-viewer";
import { isProjectEditorRole } from "@/lib/auth/permissions";
import { PipelineBoard } from "@/components/objects/pipeline-board";

export default async function PipelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [viewer, objects] = await Promise.all([getViewer(), listObjectsForProject(id)]);
  const canEdit = viewer?.role === "org_admin" || isProjectEditorRole(viewer?.projectRoles[id]);

  return <PipelineBoard projectId={id} objects={objects} canEdit={!!canEdit} />;
}

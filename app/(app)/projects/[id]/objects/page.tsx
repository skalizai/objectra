import { listObjectsForProject, getResourcesForAssignment } from "@/lib/data/objects";
import { getProjectById } from "@/lib/data/projects";
import { getViewer } from "@/lib/auth/get-viewer";
import { isProjectEditorRole } from "@/lib/auth/permissions";
import { ObjectsRegister } from "@/components/objects/objects-register";

export default async function ObjectsRegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  const [objects, resources, project] = await Promise.all([
    listObjectsForProject(id),
    viewer ? getResourcesForAssignment(viewer.profile.org_id) : Promise.resolve([]),
    getProjectById(id),
  ]);

  const canEdit = viewer?.role === "org_admin" || isProjectEditorRole(viewer?.projectRoles[id]);

  return (
    <div className="pt-5">
      <ObjectsRegister
        projectId={id}
        projectName={project?.name ?? "Objects"}
        objects={objects}
        canEdit={!!canEdit}
        resources={resources}
      />
    </div>
  );
}

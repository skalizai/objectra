import { listObjectsForProject, getResourcesForAssignment } from "@/lib/data/objects";
import { getViewer } from "@/lib/auth/get-viewer";
import { isProjectEditorRole } from "@/lib/auth/permissions";
import { ObjectsRegister } from "@/components/objects/objects-register";
import { AddObjectButton } from "@/components/objects/add-object-button";
import { ImportXlsxButton } from "@/components/objects/import-xlsx-button";

export default async function ObjectsRegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  const [objects, resources] = await Promise.all([
    listObjectsForProject(id),
    viewer ? getResourcesForAssignment(viewer.profile.org_id) : Promise.resolve([]),
  ]);

  const canEdit = viewer?.role === "org_admin" || isProjectEditorRole(viewer?.projectRoles[id]);

  return (
    <div className="pt-5">
      {canEdit && (
        <div className="mb-4 flex justify-end gap-2">
          <ImportXlsxButton projectId={id} />
          <AddObjectButton projectId={id} resources={resources} />
        </div>
      )}
      <ObjectsRegister projectId={id} objects={objects} canEdit={!!canEdit} resources={resources} />
    </div>
  );
}

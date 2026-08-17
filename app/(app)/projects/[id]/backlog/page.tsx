import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth/get-viewer";
import { isProjectEditorRole } from "@/lib/auth/permissions";
import { getBacklogItems } from "@/lib/data/backlog";
import { BacklogRegister } from "@/components/backlog/backlog-register";
import { AddBacklogItemButton } from "@/components/backlog/add-backlog-item-button";

export default async function BacklogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) return null;

  const canEdit = viewer.role === "org_admin" || isProjectEditorRole(viewer.projectRoles[id]);
  if (!canEdit) notFound();

  const items = await getBacklogItems(id);

  return (
    <div className="pt-5">
      <div className="mb-4 flex justify-end">
        <AddBacklogItemButton projectId={id} />
      </div>
      <BacklogRegister projectId={id} items={items} canEdit={canEdit} />
    </div>
  );
}

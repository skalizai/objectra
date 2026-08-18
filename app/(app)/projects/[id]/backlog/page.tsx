import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth/get-viewer";
import { isProjectEditorRole } from "@/lib/auth/permissions";
import { getBacklogApprovalLog, getBacklogApprover, getBacklogItems } from "@/lib/data/backlog";
import { BacklogRegister } from "@/components/backlog/backlog-register";
import { AddBacklogItemButton } from "@/components/backlog/add-backlog-item-button";
import { BacklogApprovalLog } from "@/components/backlog/backlog-approval-log";

export default async function BacklogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) return null;

  const canEdit = viewer.role === "org_admin" || isProjectEditorRole(viewer.projectRoles[id]);
  if (!canEdit) notFound();

  const [items, approver, approvalLog] = await Promise.all([
    getBacklogItems(id),
    getBacklogApprover(id),
    getBacklogApprovalLog(id),
  ]);

  return (
    <div className="space-y-5 pt-5">
      <div className="flex justify-end">
        <AddBacklogItemButton projectId={id} />
      </div>
      <BacklogRegister projectId={id} items={items} canEdit={canEdit} approverName={approver?.full_name ?? null} />
      <BacklogApprovalLog entries={approvalLog} />
    </div>
  );
}

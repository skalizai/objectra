import type { ProjectMemberRole } from "@/lib/types/database";

/** Project Manager and Technical Lead both have full edit rights on a
 * project (objects, assignments, invites); Member and Client don't. */
export function isProjectEditorRole(role: ProjectMemberRole | undefined): boolean {
  return role === "project_manager" || role === "technical_lead";
}

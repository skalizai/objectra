import type { ProjectMemberRole } from "@/lib/types/database";

/** Project Manager and Technical Lead both have full edit rights on a
 * project (objects, assignments, invites); Member, Client, PMO, and
 * Super User don't — super_user is deliberately excluded here, not an
 * oversight: it's a client-side ticket-raising role, not an editor role. */
export function isProjectEditorRole(role: ProjectMemberRole | undefined): boolean {
  return role === "project_manager" || role === "technical_lead";
}

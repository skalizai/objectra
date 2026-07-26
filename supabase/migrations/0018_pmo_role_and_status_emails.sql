-- PMO becomes a third assignable per-project role, same footing as
-- Project Manager and Technical Lead in Member Management/invites — but
-- intentionally NOT added to is_project_editor()/isProjectEditorRole(),
-- so it's a notification/visibility tag, not an edit grant.

alter table project_members drop constraint if exists project_members_role_check;
alter table project_members add constraint project_members_role_check
  check (role in ('project_manager', 'technical_lead', 'pmo', 'member', 'client'));

alter table invitations drop constraint if exists invitations_role_check;
alter table invitations add constraint invitations_role_check
  check (role in ('org_admin', 'project_manager', 'technical_lead', 'pmo', 'member', 'client'));

-- New email type for the object status-change notifications (assigned to
-- technical on Development in Progress, functional on Functional Testing
-- in Development, functional on Awaiting for FSD).
alter table email_log drop constraint if exists email_log_type_check;
alter table email_log add constraint email_log_type_check
  check (type in ('invite', 'deadline_alert', 'weekly_digest', 'status_change'));

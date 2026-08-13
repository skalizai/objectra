-- super_user becomes a fourth assignable project_members role — a
-- client-side key user who raises tickets and sees only their own
-- (section 15). Unlike technical_lead/pmo, this is not an editor role and
-- must not be added to is_project_editor().
--
-- Verified before writing this migration: every existing RLS policy that
-- branches on role uses an explicit allow-list (role in (...) / role = ...),
-- never an exclusion — so adding 'super_user' to these two CHECK
-- constraints grants no incidental access anywhere else in the schema.

alter table project_members drop constraint if exists project_members_role_check;
alter table project_members add constraint project_members_role_check
  check (role in ('project_manager', 'technical_lead', 'pmo', 'member', 'client', 'super_user'));

alter table invitations drop constraint if exists invitations_role_check;
alter table invitations add constraint invitations_role_check
  check (role in ('org_admin', 'project_manager', 'technical_lead', 'pmo', 'member', 'client', 'super_user'));

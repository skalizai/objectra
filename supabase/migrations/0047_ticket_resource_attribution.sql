-- Manual "Issue reported by" / "Issue assigned to" resource pickers on the
-- raise-ticket form (org_admin/PM/technical_lead only) need to work
-- without requiring the picked person to have accepted their Objectra
-- invite -- same "assign before invite" idiom as projects.pm_id,
-- backlog_approver_id, and support_routing (references resources, not
-- profiles, so it can be set before that person has a login).
--
-- These are separate from raised_by/assigned_to (which stay profile-based
-- and drive RLS/notifications/"My work"): reported_by_resource_id is a
-- purely informational tag, and assigned_to_resource_id records the
-- manager's pick even when it can't yet resolve to a real assigned_to.

alter table tickets add column reported_by_resource_id uuid references resources (id) on delete set null;
alter table tickets add column assigned_to_resource_id uuid references resources (id) on delete set null;

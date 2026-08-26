-- Adds "Under Approval" as a fourth project status alongside active/paused/closed.

alter table projects drop constraint if exists projects_status_check;
alter table projects add constraint projects_status_check
  check (status in ('active', 'paused', 'closed', 'under_approval'));

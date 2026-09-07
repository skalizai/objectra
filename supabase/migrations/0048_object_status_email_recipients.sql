-- Object status-change email CC list was hardcoded to every active
-- project_members row with role in (project_manager, technical_lead,
-- pmo) -- not configurable, and required an accepted invite (project_members
-- only has active rows for people who've logged in). Replaces that with:
-- the project's own PM (projects.pm_id, already a resource reference,
-- always CC'd) plus a project-configurable list of additional recipients
-- here, picked from the org resource roster -- no login required, same
-- "assign before invite" reasoning as sla_escalation_recipients (0032).

create table object_status_email_recipients (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  resource_id uuid not null references resources (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, resource_id)
);
create index object_status_email_recipients_project_id_idx on object_status_email_recipients (project_id);

alter table object_status_email_recipients enable row level security;

create policy object_status_email_recipients_select on object_status_email_recipients
  for select using (is_org_admin() or is_project_member(project_id));

create policy object_status_email_recipients_write on object_status_email_recipients
  for all using (is_org_admin() or is_project_editor(project_id))
  with check (is_org_admin() or is_project_editor(project_id));

-- Post-Go-Live Support Ticketing (Hypercare) — sections 14-22 of
-- OBJECTRA_BUILD_PROMPT.md. This migration: projects gain a phase +
-- go_live_date, and a per-project module -> consultant routing table that
-- ticket auto-assignment (0026) looks up.
--
-- Design note: routing/SLA administration is scoped to is_project_editor()
-- (project_manager + technical_lead), not literal project_manager-only —
-- the addendum's prose says "PM", but every prior migration in this
-- codebase (0012_technical_lead_role.sql) broadened identical "PM-only"
-- base-spec language to is_project_editor() for consistency, since the two
-- roles are the same permission level for in-project editing. Applied the
-- same way throughout the ticketing feature.

alter table projects add column phase text not null default 'implementation'
  check (phase in ('implementation', 'hypercare', 'support'));
alter table projects add column go_live_date date;

create table support_routing (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  module text not null,
  primary_consultant_id uuid references profiles (id) on delete set null,
  backup_consultant_id uuid references profiles (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, module)
);
create index support_routing_project_id_idx on support_routing (project_id);

create trigger set_updated_at before update on support_routing
  for each row execute function public.set_updated_at();

-- Only active members of the project may be named as primary/backup.
create or replace function public.support_routing_check_members()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.primary_consultant_id is not null and not exists (
    select 1 from project_members
    where project_id = new.project_id and profile_id = new.primary_consultant_id and is_active
  ) then
    raise exception 'Primary consultant must be an active member of this project';
  end if;

  if new.backup_consultant_id is not null and not exists (
    select 1 from project_members
    where project_id = new.project_id and profile_id = new.backup_consultant_id and is_active
  ) then
    raise exception 'Backup consultant must be an active member of this project';
  end if;

  return new;
end;
$$;

create trigger support_routing_check_members before insert or update on support_routing
  for each row execute function public.support_routing_check_members();

alter table support_routing enable row level security;

create policy support_routing_select on support_routing
  for select using (is_org_admin() or is_project_member(project_id));

create policy support_routing_write on support_routing
  for all using (is_org_admin() or is_project_editor(project_id))
  with check (is_org_admin() or is_project_editor(project_id));

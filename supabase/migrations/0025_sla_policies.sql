-- Per-project, per-criticality SLA targets (section 16). Defaults
-- (P1=1h/4h, P2=4h/24h, P3=24h/72h, P4=48h/1wk) are seeded from app code
-- (lib/actions/projects.ts::createProject) right after the project's
-- notification_settings row, the same way that table is already seeded —
-- not a DB-level default, so a project can be created without them and an
-- admin can freely edit/replace them afterward.

create table sla_policies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  criticality text not null check (criticality in ('P1_critical', 'P2_high', 'P3_medium', 'P4_low')),
  response_mins int not null,
  resolve_mins int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, criticality)
);
create index sla_policies_project_id_idx on sla_policies (project_id);

create trigger set_updated_at before update on sla_policies
  for each row execute function public.set_updated_at();

alter table sla_policies enable row level security;

create policy sla_policies_select on sla_policies
  for select using (is_org_admin() or is_project_member(project_id));

create policy sla_policies_write on sla_policies
  for all using (is_org_admin() or is_project_editor(project_id))
  with check (is_org_admin() or is_project_editor(project_id));

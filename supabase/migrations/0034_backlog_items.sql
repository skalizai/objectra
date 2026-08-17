-- Backlog Items — Registration & Client Approval (new project-workspace
-- feature, ported from a one-off Excel workbook built for ShiftX). PMs
-- register newly requested items with a Dev/Fiori/Functional effort
-- estimate, send a batch to the client for approval, and once approved
-- promote them into the real objects register (see 0035/0036 for the
-- dev_type picklist and approval-email plumbing).
--
-- Design notes:
--  * backlog_rate_settings is a per-project singleton, same shape as
--    notification_settings — seeded from app code in createProject(), not
--    a DB default (same reasoning as notification_settings/sla_policies).
--  * item_no mirrors generate_ticket_no (0026): <PROJECT4>-BL-<seq5>,
--    sequence scoped per project via backlog_sequences.
--  * Dev/Fiori/Functional hours+cost are stored (pure per-row math, no
--    cross-row dependency). PMO/PGLS cost and Total Cost/Days are
--    deliberately NOT stored here — they depend on the current count of
--    registered items in the project (rate pool / COUNT(*)), which changes
--    every time any sibling row is added, deleted, or a rate changes.
--    Storing them would mean recomputing every sibling row on every write.
--    lib/data/backlog.ts computes them at read time instead, same
--    "aggregate in the data layer, not SQL" convention
--    getSupportDashboardData() already uses.
--  * Visibility is editor-only (is_org_admin() or is_project_editor()) for
--    both SELECT and write — unlike objects, which every project member
--    can read. Cost/margin figures stay out of view for regular
--    consultants, super users, and clients.

create table backlog_rate_settings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references projects (id) on delete cascade,
  tech_rate numeric not null default 40,
  func_rate numeric not null default 45,
  pmo_rate numeric not null default 50,
  fiori_rate numeric not null default 40,
  hours_per_day numeric not null default 8,
  monthly_hours numeric not null default 160,
  pmo_half_time_factor numeric not null default 0.5,
  project_months numeric not null default 3,
  pgls_months numeric not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on backlog_rate_settings
  for each row execute function public.set_updated_at();

alter table backlog_rate_settings enable row level security;

create policy backlog_rate_settings_select on backlog_rate_settings
  for select using (is_org_admin() or is_project_editor(project_id));

create policy backlog_rate_settings_write on backlog_rate_settings
  for all using (is_org_admin() or is_project_editor(project_id))
  with check (is_org_admin() or is_project_editor(project_id));

-- Backfill: every project created before this migration gets a default
-- rate card immediately (all columns take their table defaults above),
-- rather than only picking one up the first time someone edits a rate
-- from Settings -> Backlog rate card.
insert into backlog_rate_settings (project_id)
select id from projects
where id not in (select project_id from backlog_rate_settings);

create table backlog_sequences (
  project_id uuid primary key references projects (id) on delete cascade,
  next_seq int not null default 1
);

create or replace function public.generate_backlog_no(p_project_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_code text;
  v_seq int;
begin
  select upper(left(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g'), 4))
    into v_project_code
  from projects where id = p_project_id;

  insert into backlog_sequences (project_id, next_seq)
  values (p_project_id, 2)
  on conflict (project_id)
    do update set next_seq = backlog_sequences.next_seq + 1
  returning next_seq - 1 into v_seq;

  return coalesce(v_project_code, 'GEN') || '-BL-' || lpad(v_seq::text, 5, '0');
end;
$$;

create table backlog_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,

  item_no text,
  company_code text,
  module text,
  lob text,
  dev_type text,
  description text not null,
  requested_by text,
  complexity text,
  go_live_critical boolean not null default false,

  dev_days numeric not null default 0,
  dev_hours numeric not null default 0,
  dev_cost numeric not null default 0,
  fiori_days numeric not null default 0,
  fiori_hours numeric not null default 0,
  fiori_cost numeric not null default 0,
  func_days numeric not null default 0,
  func_hours numeric not null default 0,
  func_cost numeric not null default 0,

  status text not null default 'registered' check (
    status in ('registered', 'sent_for_approval', 'approved', 'rejected', 'on_hold', 'moved_to_objects')
  ),
  cr_no text,
  sent_for_approval_at timestamptz,
  approval_date date,
  remarks text,

  converted_object_id uuid references objects (id) on delete set null,

  created_by uuid references profiles (id) on delete set null,
  updated_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index backlog_items_project_id_idx on backlog_items (project_id);
create index backlog_items_status_idx on backlog_items (status);

create trigger set_updated_at before update on backlog_items
  for each row execute function public.set_updated_at();

create or replace function public.backlog_items_set_item_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.item_no is null or trim(new.item_no) = '' then
    new.item_no := public.generate_backlog_no(new.project_id);
  end if;
  return new;
end;
$$;

create trigger backlog_items_01_set_item_no before insert on backlog_items
  for each row execute function public.backlog_items_set_item_no();

alter table backlog_items enable row level security;

create policy backlog_items_select on backlog_items
  for select using (is_org_admin() or is_project_editor(project_id));

create policy backlog_items_write on backlog_items
  for all using (is_org_admin() or is_project_editor(project_id))
  with check (is_org_admin() or is_project_editor(project_id));

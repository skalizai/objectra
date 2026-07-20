-- Org-managed picklists: modules, complexities, and object statuses.
-- Replaces the hard-coded status enum so admins can maintain their own
-- status list (with colour + "counts as done") from Settings.

create table picklists (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  type text not null check (type in ('module', 'complexity', 'status')),
  value text not null,
  color text,
  -- only meaningful for type='status': whether this status counts as
  -- "complete" for progress %, dashboard "live" counts, and deadline scans.
  is_done boolean not null default false,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, type, value)
);
create index picklists_org_type_idx on picklists (org_id, type);

create trigger set_updated_at before update on picklists
  for each row execute function public.set_updated_at();

alter table picklists enable row level security;

create policy picklists_select on picklists
  for select using (org_id = current_org_id());

create policy picklists_write on picklists
  for all using (is_org_admin() and org_id = current_org_id())
  with check (is_org_admin() and org_id = current_org_id());

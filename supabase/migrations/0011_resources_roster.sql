-- Resources are now a plain org-scoped roster, saved independently of
-- login access — same shape as adding a picklist value. Inviting someone
-- (creating their auth.users/profiles row and project_members) is now a
-- separate, later step triggered from this row, linked via profile_id.
create table resources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  full_name text not null,
  email text not null,
  consultant_type text check (consultant_type in ('functional', 'technical')),
  role_title text,
  primary_module text,
  location text check (location in ('onsite', 'offshore')),
  profile_id uuid references profiles (id) on delete set null,
  invite_status text not null default 'not_invited' check (invite_status in ('not_invited', 'invited')),
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, email)
);
create index resources_org_id_idx on resources (org_id);

create trigger set_updated_at before update on resources
  for each row execute function public.set_updated_at();

alter table resources enable row level security;

create policy resources_select on resources
  for select using (org_id = current_org_id());

create policy resources_write on resources
  for all using (
    is_org_admin()
    or (
      org_id = current_org_id()
      and exists (
        select 1 from project_members pm
        where pm.profile_id = auth.uid() and pm.role = 'project_manager' and pm.is_active
      )
    )
  )
  with check (
    is_org_admin()
    or (
      org_id = current_org_id()
      and exists (
        select 1 from project_members pm
        where pm.profile_id = auth.uid() and pm.role = 'project_manager' and pm.is_active
      )
    )
  );

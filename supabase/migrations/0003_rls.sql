-- Row-Level Security — section 5 of OBJECTRA_BUILD_PROMPT.md
-- SECURITY DEFINER helpers avoid recursive policy evaluation.

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
create or replace function public.current_org_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select org_id from profiles where id = auth.uid();
$$;

create or replace function public.is_org_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_org_admin from profiles where id = auth.uid()), false);
$$;

create or replace function public.is_project_member(pid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from project_members
    where project_id = pid and profile_id = auth.uid() and is_active
  );
$$;

create or replace function public.project_role(pid uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from project_members
  where project_id = pid and profile_id = auth.uid() and is_active
  limit 1;
$$;

create or replace function public.is_assigned_to_object(oid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from object_assignments
    where object_id = oid and profile_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table objects enable row level security;
alter table object_assignments enable row level security;
alter table invitations enable row level security;
alter table audit_log enable row level security;
alter table email_log enable row level security;
alter table notification_settings enable row level security;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create policy organizations_select on organizations
  for select using (id = current_org_id());

create policy organizations_update on organizations
  for update using (is_org_admin() and id = current_org_id());

-- ---------------------------------------------------------------------------
-- profiles
--   read own always; org_admin/PM read all profiles in org; update own
--   profile only (org_admin can update any profile in-org).
-- ---------------------------------------------------------------------------
create policy profiles_select_own on profiles
  for select using (id = auth.uid());

create policy profiles_select_org_staff on profiles
  for select using (
    org_id = current_org_id()
    and (
      is_org_admin()
      or exists (
        select 1 from project_members pm
        where pm.profile_id = auth.uid() and pm.role = 'project_manager' and pm.is_active
      )
    )
  );

create policy profiles_update_own on profiles
  for update using (id = auth.uid());

create policy profiles_update_org_admin on profiles
  for update using (is_org_admin() and org_id = current_org_id());

-- profiles are inserted by the handle_new_user trigger (security definer),
-- never directly by a client.

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create policy projects_select on projects
  for select using (is_org_admin() or is_project_member(id));

create policy projects_insert on projects
  for insert with check (is_org_admin() and org_id = current_org_id());

create policy projects_update on projects
  for update using (is_org_admin() or project_role(id) = 'project_manager');

create policy projects_delete on projects
  for delete using (is_org_admin());

-- ---------------------------------------------------------------------------
-- project_members
-- ---------------------------------------------------------------------------
create policy project_members_select on project_members
  for select using (is_org_admin() or is_project_member(project_id));

create policy project_members_write on project_members
  for all using (is_org_admin() or project_role(project_id) = 'project_manager')
  with check (is_org_admin() or project_role(project_id) = 'project_manager');

-- ---------------------------------------------------------------------------
-- objects
--   SELECT: org_admin, project_manager/client on the project, or assigned.
--   INSERT/UPDATE/DELETE: org_admin or the project's project_manager.
--   Members update status/notes on assigned objects via member_update_object()
--   (SECURITY DEFINER RPC), not via a direct RLS UPDATE policy.
-- ---------------------------------------------------------------------------
create policy objects_select on objects
  for select using (
    is_org_admin()
    or project_role(project_id) in ('project_manager', 'client')
    or is_assigned_to_object(id)
  );

create policy objects_insert on objects
  for insert with check (is_org_admin() or project_role(project_id) = 'project_manager');

create policy objects_update on objects
  for update using (is_org_admin() or project_role(project_id) = 'project_manager');

create policy objects_delete on objects
  for delete using (is_org_admin() or project_role(project_id) = 'project_manager');

-- ---------------------------------------------------------------------------
-- object_assignments
-- ---------------------------------------------------------------------------
create policy object_assignments_select on object_assignments
  for select using (
    is_org_admin()
    or is_project_member((select project_id from objects where id = object_id))
    or profile_id = auth.uid()
  );

create policy object_assignments_write on object_assignments
  for all using (
    is_org_admin()
    or project_role((select project_id from objects where id = object_id)) = 'project_manager'
  )
  with check (
    is_org_admin()
    or project_role((select project_id from objects where id = object_id)) = 'project_manager'
  );

-- ---------------------------------------------------------------------------
-- invitations
-- ---------------------------------------------------------------------------
create policy invitations_select on invitations
  for select using (
    is_org_admin()
    or (project_id is not null and project_role(project_id) = 'project_manager')
  );

create policy invitations_write on invitations
  for all using (
    is_org_admin()
    or (project_id is not null and project_role(project_id) = 'project_manager')
  )
  with check (
    is_org_admin()
    or (project_id is not null and project_role(project_id) = 'project_manager')
  );

-- ---------------------------------------------------------------------------
-- notification_settings
-- ---------------------------------------------------------------------------
create policy notification_settings_select on notification_settings
  for select using (is_org_admin() or is_project_member(project_id));

create policy notification_settings_write on notification_settings
  for all using (is_org_admin() or project_role(project_id) = 'project_manager')
  with check (is_org_admin() or project_role(project_id) = 'project_manager');

-- ---------------------------------------------------------------------------
-- audit_log — insert via service role only; read for org_admin + PM.
-- ---------------------------------------------------------------------------
create policy audit_log_select on audit_log
  for select using (
    is_org_admin()
    or project_role((select project_id from objects where id = object_id)) = 'project_manager'
  );

-- No insert/update/delete policies: the service role (used by server actions
-- and member_update_object's SECURITY DEFINER context) bypasses RLS; no
-- other role may write here.

-- ---------------------------------------------------------------------------
-- email_log — insert via service role only; read for org_admin + PM.
-- ---------------------------------------------------------------------------
create policy email_log_select on email_log
  for select using (
    is_org_admin()
    or (project_id is not null and project_role(project_id) = 'project_manager')
  );

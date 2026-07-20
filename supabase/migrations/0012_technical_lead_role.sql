-- Adds "technical_lead" as a third assignable project role alongside
-- project_manager/member (client is unchanged) — same permission level as
-- project_manager for editing objects/assignments within their project,
-- distinct only for reporting/labelling. "member" keeps the existing
-- restricted, invite-only, assigned-objects-only behaviour untouched.

alter table project_members drop constraint if exists project_members_role_check;
alter table project_members add constraint project_members_role_check
  check (role in ('project_manager', 'technical_lead', 'member', 'client'));

alter table invitations drop constraint if exists invitations_role_check;
alter table invitations add constraint invitations_role_check
  check (role in ('org_admin', 'project_manager', 'technical_lead', 'member', 'client'));

-- Resource roster: a default allocation captured at "add resource" time
-- (25/50/75/100 dropdown in the UI), used to pre-fill the invite step.
alter table resources add column allocation_pct int default 50
  check (allocation_pct in (25, 50, 75, 100));

create or replace function public.is_project_editor(pid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select project_role(pid) in ('project_manager', 'technical_lead');
$$;

-- Re-scope every policy that previously only recognized 'project_manager'
-- as the elevated in-project role to also recognize 'technical_lead'.

drop policy if exists objects_select on objects;
create policy objects_select on objects
  for select using (
    is_org_admin()
    or is_project_editor(project_id)
    or project_role(project_id) = 'client'
    or is_assigned_to_object(id)
  );

drop policy if exists objects_insert on objects;
create policy objects_insert on objects
  for insert with check (is_org_admin() or is_project_editor(project_id));

drop policy if exists objects_update on objects;
create policy objects_update on objects
  for update using (is_org_admin() or is_project_editor(project_id));

drop policy if exists objects_delete on objects;
create policy objects_delete on objects
  for delete using (is_org_admin() or is_project_editor(project_id));

drop policy if exists object_assignments_write on object_assignments;
create policy object_assignments_write on object_assignments
  for all using (
    is_org_admin()
    or is_project_editor((select project_id from objects where id = object_id))
  )
  with check (
    is_org_admin()
    or is_project_editor((select project_id from objects where id = object_id))
  );

drop policy if exists invitations_select on invitations;
create policy invitations_select on invitations
  for select using (
    is_org_admin()
    or (project_id is not null and is_project_editor(project_id))
  );

drop policy if exists invitations_write on invitations;
create policy invitations_write on invitations
  for all using (
    is_org_admin()
    or (project_id is not null and is_project_editor(project_id))
  )
  with check (
    is_org_admin()
    or (project_id is not null and is_project_editor(project_id))
  );

drop policy if exists notification_settings_write on notification_settings;
create policy notification_settings_write on notification_settings
  for all using (is_org_admin() or is_project_editor(project_id))
  with check (is_org_admin() or is_project_editor(project_id));

drop policy if exists project_members_write on project_members;
create policy project_members_write on project_members
  for all using (is_org_admin() or is_project_editor(project_id))
  with check (is_org_admin() or is_project_editor(project_id));

drop policy if exists projects_update on projects;
create policy projects_update on projects
  for update using (is_org_admin() or is_project_editor(id));

-- org-wide (not single-project) checks: "is this person a PM/technical
-- lead on *any* of their projects" — used to grant broader profile
-- visibility and resource-roster management.
drop policy if exists profiles_select_org_staff on profiles;
create policy profiles_select_org_staff on profiles
  for select using (
    org_id = current_org_id()
    and (
      is_org_admin()
      or exists (
        select 1 from project_members pm
        where pm.profile_id = auth.uid()
          and pm.role in ('project_manager', 'technical_lead')
          and pm.is_active
      )
    )
  );

drop policy if exists resources_write on resources;
create policy resources_write on resources
  for all using (
    is_org_admin()
    or (
      org_id = current_org_id()
      and exists (
        select 1 from project_members pm
        where pm.profile_id = auth.uid()
          and pm.role in ('project_manager', 'technical_lead')
          and pm.is_active
      )
    )
  )
  with check (
    is_org_admin()
    or (
      org_id = current_org_id()
      and exists (
        select 1 from project_members pm
        where pm.profile_id = auth.uid()
          and pm.role in ('project_manager', 'technical_lead')
          and pm.is_active
      )
    )
  );

-- Functional/Technical consultant assignment now points at the resource
-- roster (resources.id) instead of profiles.id — a resource can be
-- assigned to an object as soon as it's added, without waiting for an
-- invite/login. "Who can update status on their own objects" still keys
-- off resources.profile_id once that resource *is* invited.
--
-- Every existing object_assignments row is preserved: for any profile_id
-- already referenced, we backfill a matching resources row (creating one
-- if it somehow doesn't exist yet, e.g. the seeded org_admin) before
-- repointing the column, so no assignment is lost.

insert into resources (org_id, full_name, email, profile_id, invite_status, created_by)
select distinct p.org_id, p.full_name, p.email, p.id, 'invited', p.id
from profiles p
where p.id in (select profile_id from object_assignments)
  and not exists (select 1 from resources r where r.profile_id = p.id)
on conflict (org_id, email) do update set profile_id = excluded.profile_id;

alter table object_assignments add column resource_id uuid references resources (id) on delete cascade;

update object_assignments oa
set resource_id = r.id
from resources r
where r.profile_id = oa.profile_id;

alter table object_assignments alter column resource_id set not null;
alter table object_assignments drop constraint if exists object_assignments_object_id_profile_id_assigned_role_key;
alter table object_assignments add constraint object_assignments_object_id_resource_id_assigned_role_key
  unique (object_id, resource_id, assigned_role);

-- Both reference the profile_id column being dropped below, so they must
-- be dropped/redefined before the ALTER TABLE, not after.
drop policy if exists object_assignments_select on object_assignments;

create or replace function public.is_assigned_to_object(oid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from object_assignments oa
    join resources r on r.id = oa.resource_id
    where oa.object_id = oid and r.profile_id = auth.uid()
  );
$$;

alter table object_assignments drop column profile_id;

create index object_assignments_resource_id_idx on object_assignments (resource_id);

-- Re-point the "member sees only their assigned objects" security boundary
-- through resources.profile_id instead of object_assignments.profile_id.
create policy object_assignments_select on object_assignments
  for select using (
    is_org_admin()
    or is_project_member((select project_id from objects where id = object_id))
    or exists (select 1 from resources r where r.id = resource_id and r.profile_id = auth.uid())
  );

-- Project manager is now picked from the resources roster (resources.id)
-- instead of profiles.id — matches the same "assign before invite"
-- pattern already used for object_assignments (migration 0013), so an
-- admin can name someone as PM straight from the roster without waiting
-- for them to be invited first. Real project-editing access continues to
-- flow through project_members.profile_id, untouched here — pm_id is
-- just who's shown/picked as the project manager.

insert into resources (org_id, full_name, email, profile_id, invite_status, created_by)
select distinct p.org_id, p.full_name, p.email, p.id, 'invited', p.id
from profiles p
where p.id in (select pm_id from projects where pm_id is not null)
  and not exists (select 1 from resources r where r.profile_id = p.id)
on conflict (org_id, email) do update set profile_id = excluded.profile_id;

alter table projects add column pm_resource_id uuid references resources (id) on delete set null;

update projects pr
set pm_resource_id = r.id
from resources r
where r.profile_id = pr.pm_id;

alter table projects drop constraint if exists projects_pm_id_fkey;
alter table projects drop column pm_id;
alter table projects rename column pm_resource_id to pm_id;

create index projects_pm_id_idx on projects (pm_id);

-- Retargets support_routing's primary/backup consultant columns from
-- profiles to resources, so a PM/org_admin can set up a module's routing
-- rule against ANY resource on the org roster — invited or not — instead
-- of being blocked until that person accepts an invite. Same "assign
-- before invite" pattern object_assignments already uses (0013), for the
-- same reason: waiting on an invite to configure something that isn't
-- itself an invite shouldn't be required.
--
-- Ticket auto-routing (tickets_auto_route, 0026) still needs an actual
-- login to hand a ticket to — it now resolves the matched resource's
-- profile_id at ticket-creation time and falls back to the PM (same as
-- "no routing rule at all") when that resource hasn't been invited yet.
-- The rule itself stays configured and starts firing correctly the moment
-- they are invited, with no need to redo it.

alter table support_routing drop constraint if exists support_routing_primary_consultant_id_fkey;
alter table support_routing drop constraint if exists support_routing_backup_consultant_id_fkey;

-- Remap any existing rows (pointing at a profiles.id) to the matching
-- resources.id via resources.profile_id, so nothing already configured
-- silently breaks.
update support_routing sr
set primary_consultant_id = r.id
from resources r
where r.profile_id = sr.primary_consultant_id;

update support_routing sr
set backup_consultant_id = r.id
from resources r
where r.profile_id = sr.backup_consultant_id;

-- Guard against any value that still doesn't match a resource (shouldn't
-- happen given the remap above) rather than leaving a dangling id.
update support_routing set primary_consultant_id = null
where primary_consultant_id is not null
  and not exists (select 1 from resources where id = support_routing.primary_consultant_id);
update support_routing set backup_consultant_id = null
where backup_consultant_id is not null
  and not exists (select 1 from resources where id = support_routing.backup_consultant_id);

alter table support_routing add constraint support_routing_primary_consultant_id_fkey
  foreign key (primary_consultant_id) references resources (id) on delete set null;
alter table support_routing add constraint support_routing_backup_consultant_id_fkey
  foreign key (backup_consultant_id) references resources (id) on delete set null;

-- Eligibility can no longer require active project membership (an
-- uninvited resource has none) — just that the resource belongs to the
-- project's own org.
create or replace function public.support_routing_check_members()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select org_id into v_org_id from projects where id = new.project_id;

  if new.primary_consultant_id is not null and not exists (
    select 1 from resources where id = new.primary_consultant_id and org_id = v_org_id
  ) then
    raise exception 'Primary consultant must be a resource in this organisation';
  end if;

  if new.backup_consultant_id is not null and not exists (
    select 1 from resources where id = new.backup_consultant_id and org_id = v_org_id
  ) then
    raise exception 'Backup consultant must be a resource in this organisation';
  end if;

  return new;
end;
$$;

create or replace function public.tickets_auto_route()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_routing support_routing;
  v_assignee uuid;
  v_resolve_mins int;
begin
  select * into v_routing
  from support_routing
  where project_id = new.project_id and module = new.module and is_active
  limit 1;

  if v_routing.id is not null then
    -- Resolve the matched resource's login, if they have one yet.
    select profile_id into v_assignee from resources where id = v_routing.primary_consultant_id;

    if v_assignee is null and v_routing.backup_consultant_id is not null then
      select profile_id into v_assignee from resources where id = v_routing.backup_consultant_id;
    end if;
  end if;

  if v_assignee is not null then
    new.assigned_to := v_assignee;
    new.status := 'assigned';
  else
    -- Unrouted, or routed to a resource who isn't invited yet: fall back
    -- to the project PM, same as if no rule existed at all.
    select r.profile_id into new.assigned_to
    from projects p join resources r on r.id = p.pm_id
    where p.id = new.project_id;
    new.status := 'new';
  end if;

  select resolve_mins into v_resolve_mins
  from sla_policies
  where project_id = new.project_id and criticality = new.criticality;

  if v_resolve_mins is not null then
    new.sla_due_at := now() + (v_resolve_mins || ' minutes')::interval;
  end if;

  return new;
end;
$$;

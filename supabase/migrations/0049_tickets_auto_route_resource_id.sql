-- tickets_auto_route only ever set assigned_to (a profiles id). Ticket
-- notifications resolve the recipient's email by preferring the matching
-- resources row over the login email (see notify-ticket.ts's getContact),
-- but this org's roster allows duplicate emails across resources (0017) --
-- without an exact resource pointer, a profile_id match can land on the
-- wrong roster row and send to a stale/shared address. This mirrors
-- reassignTicket's assigned_to_resource_id (0047) into the auto-routing
-- path too, so a freshly auto-assigned ticket is just as precise as a
-- manually reassigned one.

create or replace function public.tickets_auto_route()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_routing support_routing;
  v_assignee_resource uuid;
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
    if v_assignee is not null then
      v_assignee_resource := v_routing.primary_consultant_id;
    elsif v_routing.backup_consultant_id is not null then
      select profile_id into v_assignee from resources where id = v_routing.backup_consultant_id;
      if v_assignee is not null then
        v_assignee_resource := v_routing.backup_consultant_id;
      end if;
    end if;
  end if;

  if v_assignee is not null then
    new.assigned_to := v_assignee;
    new.assigned_to_resource_id := v_assignee_resource;
    new.status := 'assigned';
  else
    -- Unrouted, or routed to a resource who isn't invited yet: fall back
    -- to the project PM, same as if no rule existed at all.
    select r.id, r.profile_id into v_assignee_resource, new.assigned_to
    from projects p join resources r on r.id = p.pm_id
    where p.id = new.project_id;
    new.assigned_to_resource_id := v_assignee_resource;
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

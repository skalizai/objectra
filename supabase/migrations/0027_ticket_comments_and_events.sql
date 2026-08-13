-- ticket_comments + ticket_events (section 16), the raiser-side
-- close/reopen RPC (needs ticket_comments to exist, hence not in 0026),
-- and get_support_summary() — the counts-only RPC backing the client's
-- read-only support summary (clients have no row-level ticket access).

create table ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets (id) on delete cascade,
  author_id uuid references profiles (id) on delete set null,
  body text not null,
  is_internal boolean not null default false,
  attachment_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ticket_comments_ticket_id_idx on ticket_comments (ticket_id);

create trigger set_updated_at before update on ticket_comments
  for each row execute function public.set_updated_at();

-- Forces author_id server-side and prevents a super user/client from ever
-- setting is_internal=true, regardless of what the client sends — a
-- BEFORE INSERT trigger rather than a WITH CHECK expression, since it
-- needs to *rewrite* the row (silently drop the internal flag) rather than
-- just reject it.
create or replace function public.ticket_comments_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_assigned_to uuid;
begin
  new.author_id := auth.uid();

  select project_id, assigned_to into v_project_id, v_assigned_to
  from tickets where id = new.ticket_id;

  -- Each sub-check is coalesced to false: is_project_editor()/project_role()
  -- return NULL (not false) for someone with no active project_members row
  -- at all (e.g. a raiser later deactivated), which would otherwise make
  -- the whole `not(...)` evaluate to NULL and silently skip forcing
  -- is_internal false — NULL is falsy in a plpgsql IF, so that path must
  -- never reach here as NULL.
  if not (
    coalesce(is_org_admin(), false)
    or coalesce(is_project_editor(v_project_id), false)
    or coalesce(v_assigned_to = auth.uid(), false)
  ) then
    new.is_internal := false;
  end if;

  return new;
end;
$$;

create trigger ticket_comments_guard before insert on ticket_comments
  for each row execute function public.ticket_comments_guard();

alter table ticket_comments enable row level security;

create policy ticket_comments_select on ticket_comments
  for select using (
    is_ticket_participant(ticket_id)
    and (
      not is_internal
      or is_org_admin()
      or is_project_editor((select project_id from tickets where id = ticket_id))
      or exists (select 1 from tickets where id = ticket_id and assigned_to = auth.uid())
    )
  );

create policy ticket_comments_insert on ticket_comments
  for insert with check (is_ticket_participant(ticket_id));

-- ---------------------------------------------------------------------------
-- ticket_events — activity timeline. No insert policy: written exclusively
-- by the trigger below (SECURITY DEFINER, runs as table owner, bypasses
-- RLS) — same idiom as audit_log/email_log.
-- ---------------------------------------------------------------------------
create table ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets (id) on delete cascade,
  event text not null check (
    event in ('created', 'assigned', 'status_change', 'reassigned', 'criticality_change', 'sla_breach', 'reopened')
  ),
  old_value text,
  new_value text,
  actor_id uuid references profiles (id) on delete set null,
  occurred_at timestamptz not null default now()
);
create index ticket_events_ticket_id_idx on ticket_events (ticket_id);

alter table ticket_events enable row level security;

create policy ticket_events_select on ticket_events
  for select using (is_ticket_participant(ticket_id));

create or replace function public.tickets_log_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    insert into ticket_events (ticket_id, event, old_value, new_value, actor_id)
    values (new.id, 'created', null, new.status, new.raised_by);

    if new.assigned_to is not null then
      insert into ticket_events (ticket_id, event, old_value, new_value, actor_id)
      values (new.id, 'assigned', null, new.assigned_to::text, new.raised_by);
    end if;

    return new;
  end if;

  if new.status is distinct from old.status then
    insert into ticket_events (ticket_id, event, old_value, new_value, actor_id)
    values (
      new.id,
      case when new.status = 'reopened' then 'reopened' else 'status_change' end,
      old.status, new.status, auth.uid()
    );
  end if;

  if new.assigned_to is distinct from old.assigned_to then
    insert into ticket_events (ticket_id, event, old_value, new_value, actor_id)
    values (new.id, 'reassigned', old.assigned_to::text, new.assigned_to::text, auth.uid());
  end if;

  if new.criticality is distinct from old.criticality then
    insert into ticket_events (ticket_id, event, old_value, new_value, actor_id)
    values (new.id, 'criticality_change', old.criticality, new.criticality, auth.uid());
  end if;

  -- auth.uid() is null here when flipped by the sla-scan cron job (service
  -- role, no session) — actor_id stays null for that event, same as any
  -- other system-driven change.
  if new.sla_breached and not old.sla_breached then
    insert into ticket_events (ticket_id, event, old_value, new_value, actor_id)
    values (new.id, 'sla_breach', null, null, auth.uid());
  end if;

  return new;
end;
$$;

create trigger tickets_log_event after insert or update on tickets
  for each row execute function public.tickets_log_event();

-- ---------------------------------------------------------------------------
-- raiser_close_or_reopen_ticket — the raiser may only act on a 'resolved'
-- ticket: accept the fix (-> closed) or reopen it (requires a comment,
-- increments reopen_count, recomputes sla_due_at and clears both alert
-- markers so the SLA scan can flag it again if it re-breaches).
-- ---------------------------------------------------------------------------
create or replace function public.raiser_close_or_reopen_ticket(
  p_ticket_id uuid,
  p_action text,
  p_comment text default null
)
returns tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  tk tickets;
  v_resolve_mins int;
begin
  select * into tk from tickets where id = p_ticket_id;

  -- IS DISTINCT FROM (not <>) so a null raised_by can't slip past the
  -- check via NULL-is-falsy IF evaluation — same fix as
  -- consultant_update_ticket() in 0026.
  if tk is null or tk.raised_by is distinct from auth.uid() then
    raise exception 'Not the raiser of this ticket';
  end if;
  if tk.status <> 'resolved' then
    raise exception 'Ticket must be resolved to close or reopen';
  end if;
  if p_action not in ('close', 'reopen') then
    raise exception 'Action must be close or reopen';
  end if;

  if p_action = 'close' then
    update tickets set status = 'closed', closed_at = now()
    where id = p_ticket_id
    returning * into tk;
    return tk;
  end if;

  if p_comment is null or trim(p_comment) = '' then
    raise exception 'A comment is required to reopen a ticket';
  end if;

  insert into ticket_comments (ticket_id, author_id, body, is_internal)
  values (p_ticket_id, auth.uid(), p_comment, false);

  select resolve_mins into v_resolve_mins
  from sla_policies
  where project_id = tk.project_id and criticality = tk.criticality;

  update tickets set
    status = 'reopened',
    reopen_count = reopen_count + 1,
    sla_due_at = case when v_resolve_mins is not null then now() + (v_resolve_mins || ' minutes')::interval else sla_due_at end,
    sla_breached = false,
    sla_breach_alerted_at = null,
    sla_warning_alerted_at = null
  where id = p_ticket_id
  returning * into tk;

  return tk;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_support_summary — counts-only rollup for the client read-only view
-- (clients have no row-level SELECT on tickets, per section 17).
-- ---------------------------------------------------------------------------
create or replace function public.get_support_summary(p_project_id uuid)
returns table (
  open_count int,
  breaching_count int,
  resolved_this_week int,
  sla_compliance_pct numeric
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not (is_org_admin() or is_project_member(p_project_id)) then
    raise exception 'Not authorized';
  end if;

  return query
  select
    count(*) filter (where t.status not in ('resolved', 'closed'))::int,
    count(*) filter (where t.status not in ('resolved', 'closed') and t.sla_breached)::int,
    count(*) filter (where t.resolved_at >= date_trunc('week', now()))::int,
    coalesce(
      round(
        100.0 * count(*) filter (where t.resolved_at >= date_trunc('week', now()) and not t.sla_breached)
          / nullif(count(*) filter (where t.resolved_at >= date_trunc('week', now())), 0),
        1
      ),
      100.0
    )
  from tickets t
  where t.project_id = p_project_id;
end;
$$;

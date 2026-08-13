-- Core tickets table (section 16) plus auto-routing (section 16's
-- "Auto-routing rule") and the consultant-side column-guarded update RPC
-- (section 17). ticket_comments/ticket_events and the raiser-side
-- close/reopen RPC (which needs ticket_comments to exist) follow in 0027.
--
-- Design notes:
--  * assigned_to / raised_by reference profiles, not resources — unlike
--    object_assignments, a ticket needs someone who can actually log in and
--    work it. This is deliberate, not an oversight to "fix" toward the
--    resources-indirection pattern used elsewhere.
--  * ticket_no mirrors generate_wricef_id (0007): a short code derived from
--    projects.name, sequence scoped per project via ticket_sequences.
--  * sla_due_at is computed from sla_policies.resolve_mins for the ticket's
--    criticality at creation time, and recomputed (0027) on reopen.
--  * sla_breach_alerted_at / sla_warning_alerted_at back the SLA-scan job's
--    idempotency (0028+): cleared whenever sla_due_at is recomputed, so a
--    breach is alerted at most once per "episode" of being overdue.

create table ticket_sequences (
  project_id uuid primary key references projects (id) on delete cascade,
  next_seq int not null default 1
);

create table tickets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,

  ticket_no text,
  module text not null,
  criticality text not null check (
    criticality in ('P1_critical', 'P2_high', 'P3_medium', 'P4_low')
  ),
  subject text not null,
  description text,
  category text not null default 'incident' check (
    category in ('incident', 'service_request', 'question')
  ),
  status text not null default 'new' check (
    status in ('new', 'assigned', 'in_progress', 'pending_user', 'resolved', 'closed', 'reopened')
  ),

  raised_by uuid references profiles (id) on delete set null,
  assigned_to uuid references profiles (id) on delete set null,
  related_object_id uuid references objects (id) on delete set null,

  attachment_paths text[] not null default '{}',
  resolution_note text,
  effort_hours numeric,

  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  reopen_count int not null default 0,

  sla_due_at timestamptz,
  sla_breached boolean not null default false,
  sla_breach_alerted_at timestamptz,
  sla_warning_alerted_at timestamptz,

  external_ref_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, ticket_no)
);
create index tickets_project_id_idx on tickets (project_id);
create index tickets_raised_by_idx on tickets (raised_by);
create index tickets_assigned_to_idx on tickets (assigned_to);
create index tickets_status_idx on tickets (status);
create index tickets_module_idx on tickets (module);
create index tickets_related_object_id_idx on tickets (related_object_id);

create trigger set_updated_at before update on tickets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ticket_no generation — mirrors generate_wricef_id (0007_wricef_id_generation.sql)
-- ---------------------------------------------------------------------------
create or replace function public.generate_ticket_no(p_project_id uuid)
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

  insert into ticket_sequences (project_id, next_seq)
  values (p_project_id, 2)
  on conflict (project_id)
    do update set next_seq = ticket_sequences.next_seq + 1
  returning next_seq - 1 into v_seq;

  return coalesce(v_project_code, 'GEN') || '-INC-' || lpad(v_seq::text, 5, '0');
end;
$$;

-- Same-event BEFORE INSERT triggers fire in name-alphabetical order —
-- the "01"/"02" prefixes are load-bearing, not decorative.

create or replace function public.tickets_set_ticket_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.raised_by := auth.uid();
  if new.ticket_no is null or trim(new.ticket_no) = '' then
    new.ticket_no := public.generate_ticket_no(new.project_id);
  end if;
  return new;
end;
$$;

create trigger tickets_01_set_ticket_no before insert on tickets
  for each row execute function public.tickets_set_ticket_no();

-- ---------------------------------------------------------------------------
-- Auto-routing: module -> consultant via support_routing, falling back to
-- the project PM (unrouted) when no active routing rule exists. Also
-- computes sla_due_at from the project's sla_policies for the ticket's
-- criticality.
-- ---------------------------------------------------------------------------
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
    if exists (
      select 1 from project_members
      where project_id = new.project_id and profile_id = v_routing.primary_consultant_id and is_active
    ) then
      v_assignee := v_routing.primary_consultant_id;
    elsif v_routing.backup_consultant_id is not null and exists (
      select 1 from project_members
      where project_id = new.project_id and profile_id = v_routing.backup_consultant_id and is_active
    ) then
      v_assignee := v_routing.backup_consultant_id;
    end if;
  end if;

  if v_assignee is not null then
    new.assigned_to := v_assignee;
    new.status := 'assigned';
  else
    -- Unrouted: fall back to the project PM. projects.pm_id is a
    -- resources.id (0016_project_pm_uses_resources.sql), so resolve it to
    -- the matching profile — if that resource hasn't been invited yet
    -- (no profile_id), the ticket stays unassigned but still lands as
    -- 'new', which is what the dashboard's "unrouted" tile keys off.
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

create trigger tickets_02_auto_route before insert on tickets
  for each row execute function public.tickets_auto_route();

-- ---------------------------------------------------------------------------
-- is_ticket_participant — raised it, assigned to it, or PM/editor/admin on
-- its project.
-- ---------------------------------------------------------------------------
create or replace function public.is_ticket_participant(tid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from tickets t
    where t.id = tid
      and (
        t.raised_by = auth.uid()
        or t.assigned_to = auth.uid()
        or is_project_editor(t.project_id)
        or is_org_admin()
      )
  );
$$;

alter table tickets enable row level security;

-- SELECT: org_admin, project editor (PM/technical_lead) on the project, the
-- raiser, or the assignee. Clients get no row-level access — their summary
-- is served by get_support_summary() (0027), a counts-only RPC.
create policy tickets_select on tickets
  for select using (
    is_org_admin()
    or is_project_editor(project_id)
    or raised_by = auth.uid()
    or assigned_to = auth.uid()
  );

-- INSERT: super_user, project editor, or org_admin — only while the
-- project's phase allows tickets.
create policy tickets_insert on tickets
  for insert with check (
    (
      is_org_admin()
      or is_project_editor(project_id)
      or project_role(project_id) = 'super_user'
    )
    and exists (
      select 1 from projects p
      where p.id = project_id and p.phase in ('hypercare', 'support')
    )
  );

-- UPDATE: org_admin/project editor get full write access (reassign,
-- re-route, criticality, close/reopen). The assigned consultant and the
-- raiser get narrower, column-guarded access via SECURITY DEFINER RPCs
-- below instead of a direct RLS policy — same idiom as member_update_object.
create policy tickets_update on tickets
  for update using (is_org_admin() or is_project_editor(project_id));

-- ---------------------------------------------------------------------------
-- consultant_update_ticket — the assigned consultant may update only
-- status, resolution_note, and effort_hours. First call on a ticket sets
-- first_response_at; moving into 'resolved' sets resolved_at.
-- ---------------------------------------------------------------------------
create or replace function public.consultant_update_ticket(
  p_ticket_id uuid,
  p_status text default null,
  p_resolution_note text default null,
  p_effort_hours numeric default null
)
returns tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  tk tickets;
begin
  select * into tk from tickets where id = p_ticket_id;

  -- tk.assigned_to IS DISTINCT FROM auth.uid() (not <>) so a NULL
  -- assigned_to (unrouted ticket) correctly rejects the caller instead of
  -- evaluating to NULL/false and silently letting anyone through.
  if tk is null or tk.assigned_to is distinct from auth.uid() then
    raise exception 'Not assigned to this ticket';
  end if;

  if p_status is not null and p_status not in ('assigned', 'in_progress', 'pending_user', 'resolved') then
    raise exception 'Consultants may only set status to assigned, in_progress, pending_user, or resolved';
  end if;

  update tickets set
    status = coalesce(p_status, status),
    resolution_note = coalesce(p_resolution_note, resolution_note),
    effort_hours = coalesce(p_effort_hours, effort_hours),
    first_response_at = coalesce(first_response_at, now()),
    resolved_at = case when p_status = 'resolved' then now() else resolved_at end
  where id = p_ticket_id
  returning * into tk;

  return tk;
end;
$$;

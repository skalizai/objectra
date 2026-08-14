-- SLA escalation ladder: three tiers (SL1/SL2/SL3), each with its own
-- "still unresolved after N minutes" threshold and its own list of email
-- recipients (picked from the org resource roster — no login required,
-- these are FYI notifications, not ticket ownership, so unlike routing
-- there's no need to resolve a profile at all). sla-scan (0026/0028) picks
-- this up alongside the existing per-criticality breach/warning check.

create table sla_escalation_tiers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  tier text not null check (tier in ('SL1', 'SL2', 'SL3')),
  threshold_mins int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, tier)
);
create index sla_escalation_tiers_project_id_idx on sla_escalation_tiers (project_id);

create trigger set_updated_at before update on sla_escalation_tiers
  for each row execute function public.set_updated_at();

alter table sla_escalation_tiers enable row level security;

create policy sla_escalation_tiers_select on sla_escalation_tiers
  for select using (is_org_admin() or is_project_member(project_id));

create policy sla_escalation_tiers_write on sla_escalation_tiers
  for all using (is_org_admin() or is_project_editor(project_id))
  with check (is_org_admin() or is_project_editor(project_id));

create table sla_escalation_recipients (
  id uuid primary key default gen_random_uuid(),
  tier_id uuid not null references sla_escalation_tiers (id) on delete cascade,
  resource_id uuid not null references resources (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tier_id, resource_id)
);
create index sla_escalation_recipients_tier_id_idx on sla_escalation_recipients (tier_id);

alter table sla_escalation_recipients enable row level security;

create policy sla_escalation_recipients_select on sla_escalation_recipients
  for select using (
    is_org_admin()
    or exists (
      select 1 from sla_escalation_tiers t
      where t.id = tier_id and is_project_member(t.project_id)
    )
  );

create policy sla_escalation_recipients_write on sla_escalation_recipients
  for all using (
    is_org_admin()
    or exists (
      select 1 from sla_escalation_tiers t
      where t.id = tier_id and is_project_editor(t.project_id)
    )
  )
  with check (
    is_org_admin()
    or exists (
      select 1 from sla_escalation_tiers t
      where t.id = tier_id and is_project_editor(t.project_id)
    )
  );

-- Idempotency markers, same idiom as sla_breach_alerted_at/
-- sla_warning_alerted_at — cleared on reopen (below) so a ticket that
-- breaches again after being reopened can re-escalate through all three
-- tiers again.
alter table tickets add column sl1_alerted_at timestamptz;
alter table tickets add column sl2_alerted_at timestamptz;
alter table tickets add column sl3_alerted_at timestamptz;

alter table email_log drop constraint if exists email_log_type_check;
alter table email_log add constraint email_log_type_check
  check (type in (
    'invite', 'deadline_alert', 'weekly_digest', 'status_change',
    'ticket_created', 'ticket_assigned', 'ticket_status', 'sla_alert', 'sla_escalation'
  ));

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
    sla_warning_alerted_at = null,
    sl1_alerted_at = null,
    sl2_alerted_at = null,
    sl3_alerted_at = null
  where id = p_ticket_id
  returning * into tk;

  return tk;
end;
$$;

-- Backlog Items — PM Approval Workflow. "Send for approval" now notifies a
-- designated project Approver (falls back to the project's PM) instead of
-- the client, with an auto-generated batch reference distinguishing
-- individual vs package sends, and an append-only audit log of every
-- send/decision. The existing client-facing email moves to a separate
-- sendToClient() action (lib/actions/backlog.ts), gated to already-approved
-- items — see the design note in the implementation plan for why this
-- replaces (rather than sits alongside) the original client-email trigger.

alter table projects add column backlog_approver_id uuid references resources (id) on delete set null;

alter table backlog_items add column approval_mode text check (approval_mode in ('individual', 'package'));
alter table backlog_items add column approval_batch_ref text;

create table backlog_approval_sequences (
  project_id uuid primary key references projects (id) on delete cascade,
  next_seq int not null default 1
);

-- One shared counter for both prefixes (PKG-/APR-ITM-) -- the prefix
-- itself already disambiguates individual from package sends, so a
-- second counter would just be extra bookkeeping for no real benefit.
create or replace function public.generate_approval_ref(p_project_id uuid, p_mode text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_code text;
  v_seq int;
  v_prefix text;
begin
  select upper(left(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g'), 4))
    into v_project_code
  from projects where id = p_project_id;

  insert into backlog_approval_sequences (project_id, next_seq)
  values (p_project_id, 2)
  on conflict (project_id)
    do update set next_seq = backlog_approval_sequences.next_seq + 1
  returning next_seq - 1 into v_seq;

  v_prefix := case when p_mode = 'package' then 'PKG' else 'APR-ITM' end;

  return coalesce(v_project_code, 'GEN') || '-' || v_prefix || '-' || lpad(v_seq::text, 5, '0');
end;
$$;

-- Append-only audit trail: every "sent for approval" and every approve/
-- reject/on-hold decision gets a row. Deliberately no UPDATE/DELETE
-- policy at all -- immutability enforced at the RLS layer, not just by
-- convention, same idiom ticket_events uses.
create table backlog_approval_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  batch_ref text,
  item_ids uuid[] not null,
  action text not null check (action in ('sent', 'approved', 'rejected', 'on_hold')),
  actor_id uuid references profiles (id) on delete set null,
  total_days numeric,
  note text,
  created_at timestamptz not null default now()
);
create index backlog_approval_log_project_id_idx on backlog_approval_log (project_id);

alter table backlog_approval_log enable row level security;

create policy backlog_approval_log_select on backlog_approval_log
  for select using (is_org_admin() or is_project_editor(project_id));

create policy backlog_approval_log_insert on backlog_approval_log
  for insert with check (is_org_admin() or is_project_editor(project_id));

alter table email_log drop constraint if exists email_log_type_check;
alter table email_log add constraint email_log_type_check
  check (type in (
    'invite', 'deadline_alert', 'weekly_digest', 'status_change',
    'ticket_created', 'ticket_assigned', 'ticket_status', 'sla_alert', 'sla_escalation',
    'backlog_approval_request', 'backlog_pm_approval_request'
  ));

-- Microsoft Teams integration, Tier A (Addendum 2, sections 23-31):
-- raise/query tickets from a Teams channel via an Outgoing Webhook, and
-- push ticket lifecycle events back in via an Incoming Webhook/Workflow.
-- Webhook URL/HMAC secret are plain columns behind strict RLS (org_admin/
-- project editor only) rather than Vault/pgsodium -- same trust model
-- every other project-config field in this app already uses, no new
-- Postgres extension needed.

create table teams_connections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references projects (id) on delete cascade,
  team_name text,
  channel_name text,
  outbound_webhook_url text,
  inbound_hmac_secret text,
  notify_created boolean not null default true,
  notify_status boolean not null default true,
  notify_sla boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on teams_connections
  for each row execute function public.set_updated_at();

alter table teams_connections enable row level security;
create policy teams_connections_all on teams_connections
  for all using (is_org_admin() or is_project_editor(project_id))
  with check (is_org_admin() or is_project_editor(project_id));

alter table tickets add column source text not null default 'web' check (source in ('web', 'teams'));
alter table tickets add column source_conversation_id text;
alter table tickets add column source_message_id text;
alter table tickets add column source_message_link text;

-- Structural dedupe: a retried/duplicated Teams message can't create a
-- second ticket even under a race -- this is a real constraint, not just
-- an application-level check.
create unique index tickets_project_source_message_idx
  on tickets (project_id, source_message_id) where source_message_id is not null;

create table integration_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  event text not null,
  ticket_id uuid references tickets (id) on delete set null,
  status text not null check (status in ('ok', 'failed')),
  error text,
  payload_digest text,
  occurred_at timestamptz not null default now()
);
create index integration_log_project_id_idx on integration_log (project_id);

alter table integration_log enable row level security;
create policy integration_log_select on integration_log
  for select using (is_org_admin() or is_project_editor(project_id));
-- Deliberately no insert/update/delete policy -- only the service-role
-- admin client writes here (webhook route, outbound poster, sla-scan).

-- Lets a trusted service-role caller (the Teams inbound webhook) stamp
-- raised_by itself, after it has already resolved+authorized the real
-- person server-side. Ordinary user sessions are unaffected -- still
-- always forced to their own auth.uid(), so the web app can never spoof
-- another person as a ticket's raiser.
create or replace function public.tickets_set_ticket_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    new.raised_by := coalesce(new.raised_by, auth.uid());
  else
    new.raised_by := auth.uid();
  end if;
  if new.ticket_no is null or trim(new.ticket_no) = '' then
    new.ticket_no := public.generate_ticket_no(new.project_id);
  end if;
  return new;
end;
$$;

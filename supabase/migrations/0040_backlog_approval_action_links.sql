-- Approve/Reject action links in the PM approval email. The approver may
-- not have an Objectra login yet (same "assign before invite" reasoning as
-- backlog_approver_id itself), so clicking Approve/Reject in the email must
-- work without a session -- the token below is the credential, same trust
-- model /auth/confirm's token_hash already uses.

create table backlog_approval_tokens (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  batch_ref text not null,
  item_ids uuid[] not null,
  token uuid not null default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'used', 'expired')),
  resolved_action text check (resolved_action in ('approved', 'rejected')),
  expires_at timestamptz not null default (now() + interval '30 days'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index backlog_approval_tokens_token_idx on backlog_approval_tokens (token);
create index backlog_approval_tokens_project_id_idx on backlog_approval_tokens (project_id);

alter table backlog_approval_tokens enable row level security;
-- Deliberately zero policies -- only the service-role admin client may
-- touch this table (same convention email_log uses, 0001_schema.sql). The
-- unauthenticated /api/backlog-approval route is the only caller and always
-- uses createAdminClient(), never the session-scoped client.

-- Objectra core schema
-- Section 4 of OBJECTRA_BUILD_PROMPT.md

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- profiles (mirrors auth.users; id = auth uid)
-- is_org_admin is not in the original field list but is required to back the
-- is_org_admin() RLS helper — org_admin is an org-wide role, not scoped by
-- project_members like the other three roles.
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references organizations (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  title text,
  avatar_url text,
  skills text[] not null default '{}',
  is_org_admin boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_org_id_idx on profiles (org_id);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  client_name text not null,
  code text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'paused', 'closed')),
  start_date date,
  target_go_live date,
  pm_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, code)
);
create index projects_org_id_idx on projects (org_id);
create index projects_pm_id_idx on projects (pm_id);

-- ---------------------------------------------------------------------------
-- project_members
-- ---------------------------------------------------------------------------
create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  role text not null check (role in ('project_manager', 'member', 'client')),
  allocation_pct int not null default 0 check (allocation_pct between 0 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, profile_id)
);
create index project_members_project_id_idx on project_members (project_id);
create index project_members_profile_id_idx on project_members (profile_id);

-- ---------------------------------------------------------------------------
-- objects — the tracked work item (default WRICEF template)
-- ---------------------------------------------------------------------------
create table objects (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,

  wricef_id text,
  object_type text not null check (
    object_type in ('Workflow', 'Report', 'Interface', 'Conversion', 'Enhancement', 'Form', 'Application')
  ),
  title text not null,
  description text,
  module text,
  wave text,
  sprint text,
  lob text,
  clean_core text,
  complexity text,
  go_live_critical boolean not null default false,
  priority text,
  priority_rank int,
  status text not null default 'process_pending' check (
    status in ('in_progress', 'dev_func_testing', 'testing_in_q', 'validation', 'live', 'process_pending')
  ),
  company_code text,
  customizing_request text,
  transport_requests text,
  transport_type text,
  efforts text,
  impact_code text,
  uploaded_path text,

  due_date date,
  due_date_raw text,
  planned_fsd date,
  planned_fsd_raw text,
  dev_start date,
  dev_start_raw text,
  dev_baseline date,
  dev_baseline_raw text,
  dev_planned date,
  dev_planned_raw text,
  dev_actual date,
  dev_actual_raw text,

  admin_note text,
  comments text,
  comments2 text,

  is_custom boolean not null default false,
  created_by uuid references profiles (id) on delete set null,
  updated_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index objects_project_id_idx on objects (project_id);
create index objects_wricef_id_idx on objects (wricef_id);
create index objects_status_idx on objects (status);
create index objects_due_date_idx on objects (due_date);

-- ---------------------------------------------------------------------------
-- object_assignments — per-user visibility keys off this table
-- ---------------------------------------------------------------------------
create table object_assignments (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references objects (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  assigned_role text not null check (assigned_role in ('developer', 'functional')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (object_id, profile_id, assigned_role)
);
create index object_assignments_object_id_idx on object_assignments (object_id);
create index object_assignments_profile_id_idx on object_assignments (profile_id);

-- ---------------------------------------------------------------------------
-- invitations
-- ---------------------------------------------------------------------------
create table invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  project_id uuid references projects (id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null check (role in ('org_admin', 'project_manager', 'member', 'client')),
  allocation_pct int not null default 0 check (allocation_pct between 0 and 100),
  invited_by uuid references profiles (id) on delete set null,
  token uuid not null default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invitations_org_id_idx on invitations (org_id);
create index invitations_project_id_idx on invitations (project_id);
create unique index invitations_token_idx on invitations (token);
create index invitations_email_status_idx on invitations (email, status);

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references objects (id) on delete cascade,
  field text not null,
  old_value text,
  new_value text,
  changed_by uuid references profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);
create index audit_log_object_id_idx on audit_log (object_id);

-- ---------------------------------------------------------------------------
-- email_log
-- ---------------------------------------------------------------------------
create table email_log (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('invite', 'deadline_alert', 'weekly_digest')),
  to_email text not null,
  subject text not null,
  project_id uuid references projects (id) on delete set null,
  status text not null check (status in ('sent', 'failed')),
  provider_id text,
  error text,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index email_log_project_id_idx on email_log (project_id);
create index email_log_type_idx on email_log (type);

-- ---------------------------------------------------------------------------
-- notification_settings — one row per project
-- ---------------------------------------------------------------------------
create table notification_settings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references projects (id) on delete cascade,
  deadline_alerts_enabled boolean not null default true,
  deadline_lead_days int not null default 7,
  weekly_digest_enabled boolean not null default true,
  digest_day text not null default 'mon' check (
    digest_day in ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')
  ),
  digest_recipients jsonb not null default '{"pms": true, "clients": true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

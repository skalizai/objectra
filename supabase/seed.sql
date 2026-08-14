-- Objectra seed data — a demo org + one org_admin, for local development.
-- Run via `npm run db:reset`.

create temporary table if not exists seed_ids (k text primary key, v uuid);

do $$
declare
  v_org_id uuid;
  v_admin_id uuid := gen_random_uuid();
  v_admin_resource_id uuid;
  v_project_id uuid;
  v_superuser_id uuid := gen_random_uuid();
begin
  insert into organizations (id, name, slug)
  values (gen_random_uuid(), 'Demo Organization', 'demo-organization')
  returning id into v_org_id;

  -- Seed the org_admin directly into auth.users (mirrors what
  -- supabase.auth.admin.createUser would do).
  -- handle_new_user() reads org_id/full_name/is_org_admin from
  -- raw_user_meta_data and creates the matching profiles row.
  -- email_change / email_change_token_new have no column default (unlike
  -- the other token columns) and are left NULL if omitted — GoTrue's Go
  -- struct scans them as non-nullable strings, so a NULL there 500s every
  -- login with "Database error querying schema". Must be set to ''.
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change, email_change_token_new
  ) values (
    v_admin_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@objectra.local',
    crypt('ChangeMe123!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object(
      'org_id', v_org_id,
      'full_name', 'Demo Admin',
      'is_org_admin', true
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_admin_id::text,
    v_admin_id,
    jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@objectra.local'),
    'email',
    now(),
    now()
  );

  -- The admin also needs a resources roster entry — projects.pm_id points
  -- at resources.id (migration 0016_project_pm_uses_resources.sql), not
  -- profiles.id directly.
  insert into resources (org_id, full_name, email, profile_id, invite_status, created_by)
  values (v_org_id, 'Demo Admin', 'admin@objectra.local', v_admin_id, 'invited', v_admin_id)
  returning id into v_admin_resource_id;

  -- A super_user test login (client-side key user for the hypercare demo)
  -- — same auth.users/auth.identities pattern and the same email_change
  -- gotcha noted above.
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change, email_change_token_new
  ) values (
    v_superuser_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'superuser@objectra.local',
    crypt('ChangeMe123!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('org_id', v_org_id, 'full_name', 'Demo Super User', 'is_org_admin', false),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_superuser_id::text,
    v_superuser_id,
    jsonb_build_object('sub', v_superuser_id::text, 'email', 'superuser@objectra.local'),
    'email',
    now(),
    now()
  );

  -- A sample project so the app has something to show on first login. In
  -- hypercare from day one so the Support tab and ticketing flow are
  -- exercisable immediately without a manual phase flip.
  insert into projects (id, org_id, name, client_name, code, description, status, pm_id, phase, go_live_date)
  values (
    gen_random_uuid(), v_org_id, 'Sample S/4HANA Rollout', 'Acme Corp', 'ACME-01',
    'Seeded sample project for local development.', 'active', v_admin_resource_id, 'hypercare', current_date - 30
  )
  returning id into v_project_id;

  insert into project_members (project_id, profile_id, role, allocation_pct)
  values
    (v_project_id, v_admin_id, 'project_manager', 50),
    (v_project_id, v_superuser_id, 'super_user', 0);

  insert into notification_settings (project_id)
  values (v_project_id);

  -- Default SLA policy (matches lib/actions/projects.ts::createProject's
  -- defaults for a real admin-created project).
  insert into sla_policies (project_id, criticality, response_mins, resolve_mins)
  values
    (v_project_id, 'P1_critical', 60, 240),
    (v_project_id, 'P2_high', 240, 1440),
    (v_project_id, 'P3_medium', 1440, 4320),
    (v_project_id, 'P4_low', 2880, 10080);

  -- Routes SD to the admin (a degenerate but functional fixture — the seed
  -- only has one real internal user). FI is deliberately left unrouted so
  -- the Support dashboard's "unrouted" tile has something to show out of
  -- the box. support_routing references resources, not profiles
  -- (0031_routing_uses_resources.sql), hence v_admin_resource_id here.
  insert into support_routing (project_id, module, primary_consultant_id, is_active)
  values (v_project_id, 'SD', v_admin_resource_id, true);

  -- Default picklists — admins can add/remove more from Settings.
  insert into picklists (org_id, type, value, color, is_done, sort_order) values
    (v_org_id, 'module', 'MM', null, false, 1),
    (v_org_id, 'module', 'SD', null, false, 2),
    (v_org_id, 'module', 'OTC', null, false, 3),
    (v_org_id, 'module', 'FI', null, false, 4),
    (v_org_id, 'module', 'PP', null, false, 5),
    (v_org_id, 'complexity', 'Low', null, false, 1),
    (v_org_id, 'complexity', 'Medium', null, false, 2),
    (v_org_id, 'complexity', 'High', null, false, 3),
    (v_org_id, 'status', 'Process/Pending', '#7A8492', false, 1),
    (v_org_id, 'status', 'In Progress', '#E0A340', false, 2),
    (v_org_id, 'status', 'Dev/Func Testing', '#34C6D6', false, 3),
    (v_org_id, 'status', 'Testing in QA', '#4C8DF6', false, 4),
    (v_org_id, 'status', 'Validation', '#9A7CF7', false, 5),
    (v_org_id, 'status', 'Live', '#35C08A', true, 6);

  -- A couple of sample objects so the register isn't empty on first login.
  -- wricef_id is left null so the auto-generation trigger fills it in.
  insert into objects (project_id, object_type, title, module, complexity, status, fds_received, due_date, description, created_by, updated_by)
  values
    (v_project_id, 'Interface', 'SAP to Salesforce order sync', 'SD', 'High', 'In Progress', true, current_date + 10, 'Real-time order sync between S/4HANA and Salesforce.', v_admin_id, v_admin_id),
    (v_project_id, 'Report', 'Regional sales variance report', 'SD', 'Medium', 'Process/Pending', false, current_date + 21, 'Monthly variance report by region and material group.', v_admin_id, v_admin_id);

  insert into seed_ids values ('project_id', v_project_id), ('superuser_id', v_superuser_id)
  on conflict (k) do update set v = excluded.v;
end $$;

-- Two sample tickets, raised while impersonating the super_user so the
-- tickets_01_set_ticket_no trigger's `new.raised_by := auth.uid();` picks
-- up the right person (this script otherwise runs as the migration/seed
-- role, which has no auth.uid()) — same impersonation pattern as
-- supabase/tests/tickets_rls_smoke_test.sql.
select set_config('request.jwt.claims', json_build_object('sub', (select v from seed_ids where k = 'superuser_id')::text, 'role', 'authenticated')::text, true);
set local role authenticated;

-- Routed: SD has a support_routing rule, so this auto-assigns to the admin
-- and computes sla_due_at from the seeded SLA policy.
insert into tickets (project_id, module, criticality, subject, description)
values (
  (select v from seed_ids where k = 'project_id'), 'SD', 'P2_high',
  'Order sync failing for EU orders', 'Salesforce sync job errors out on orders with a EU billing address.'
);

-- Unrouted: no support_routing rule for FI, so this lands on the PM with
-- status 'new' — exercises the dashboard's "unrouted" tile out of the box.
insert into tickets (project_id, module, criticality, subject, description)
values (
  (select v from seed_ids where k = 'project_id'), 'FI', 'P3_medium',
  'Cost center report shows stale data', 'The FI cost center report appears to be a day behind.'
);

reset role;

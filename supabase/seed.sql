-- Objectra seed data — a demo org + one org_admin, for local development.
-- Run via `npm run db:reset`.

do $$
declare
  v_org_id uuid;
  v_admin_id uuid := gen_random_uuid();
  v_project_id uuid;
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

  -- A sample project so the app has something to show on first login.
  insert into projects (id, org_id, name, client_name, code, description, status, pm_id)
  values (
    gen_random_uuid(), v_org_id, 'Sample S/4HANA Rollout', 'Acme Corp', 'ACME-01',
    'Seeded sample project for local development.', 'active', v_admin_id
  )
  returning id into v_project_id;

  insert into project_members (project_id, profile_id, role, allocation_pct)
  values (v_project_id, v_admin_id, 'project_manager', 50);

  insert into notification_settings (project_id)
  values (v_project_id);

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
end $$;

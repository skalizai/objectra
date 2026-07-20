-- Manual RLS smoke test — run against a freshly seeded local DB
-- (`npm run db:reset`) with `psql` or the Supabase SQL editor.
--
-- Proves the core security boundary from section 11 of the build prompt:
-- a member cannot SELECT an object they are not assigned to, even via a
-- direct query — this is enforced by Postgres RLS, not the UI.
--
-- Usage: run each block in order. `set_config('request.jwt.claims', ...)`
-- plus `set role authenticated` is how Supabase's PostgREST simulates a
-- logged-in user inside a plain SQL session.

begin;

-- 1. Set up two members and one object assigned to only one of them.
do $$
declare
  v_org_id uuid;
  v_project_id uuid;
  v_member_a uuid := gen_random_uuid();
  v_member_b uuid := gen_random_uuid();
  v_object_id uuid;
begin
  select id into v_org_id from organizations order by created_at limit 1;

  insert into projects (id, org_id, name, client_name, code, status)
  values (gen_random_uuid(), v_org_id, 'RLS Test Project', 'Test Client', 'RLSTEST', 'active')
  returning id into v_project_id;

  insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
  values
    (v_member_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member-a@test.local', now(), now()),
    (v_member_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member-b@test.local', now(), now());

  insert into profiles (id, org_id, full_name, email)
  values
    (v_member_a, v_org_id, 'Member A', 'member-a@test.local'),
    (v_member_b, v_org_id, 'Member B', 'member-b@test.local');

  insert into project_members (project_id, profile_id, role, allocation_pct)
  values
    (v_project_id, v_member_a, 'member', 50),
    (v_project_id, v_member_b, 'member', 50);

  insert into objects (id, project_id, object_type, title, status)
  values (gen_random_uuid(), v_project_id, 'Report', 'Assigned only to Member A', 'in_progress')
  returning id into v_object_id;

  insert into object_assignments (object_id, profile_id, assigned_role)
  values (v_object_id, v_member_a, 'developer');

  -- stash ids for the next blocks via a temp table (session-scoped)
  create temporary table if not exists rls_test_ids (k text primary key, v uuid);
  insert into rls_test_ids values ('object_id', v_object_id), ('member_a', v_member_a), ('member_b', v_member_b)
  on conflict (k) do update set v = excluded.v;
end $$;

-- 2. Impersonate Member B (NOT assigned) and expect zero rows.
select set_config('request.jwt.claims', json_build_object('sub', (select v from rls_test_ids where k = 'member_b')::text, 'role', 'authenticated')::text, true);
set local role authenticated;

select
  case when count(*) = 0 then 'PASS: member cannot see unassigned object' else 'FAIL: unassigned object leaked' end as result
from objects
where id = (select v from rls_test_ids where k = 'object_id');

reset role;

-- 3. Impersonate Member A (assigned) and expect one row.
select set_config('request.jwt.claims', json_build_object('sub', (select v from rls_test_ids where k = 'member_a')::text, 'role', 'authenticated')::text, true);
set local role authenticated;

select
  case when count(*) = 1 then 'PASS: assigned member can see their object' else 'FAIL: assigned member cannot see own object' end as result
from objects
where id = (select v from rls_test_ids where k = 'object_id');

reset role;

rollback; -- discard all test fixtures, including the seeded rows above

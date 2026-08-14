-- Manual RLS smoke test for the ticketing module — run against a freshly
-- seeded local DB (`npm run db:reset`) with `psql` or the Supabase SQL
-- editor, same usage as supabase/tests/rls_smoke_test.sql.
--
-- NOTE on that other file: as of this writing, rls_smoke_test.sql is stale
-- — it inserts into object_assignments(object_id, profile_id, ...), a
-- column dropped in migration 0013_assignments_use_resources.sql (assignments
-- now key off resources.id), so it would fail as written today. This is a
-- pre-existing issue, not something this file fixes — flagged here so it
-- isn't mistaken for something the ticketing feature introduced.
--
-- Proves the section 17 security boundaries:
--  1. A super user cannot SELECT another super user's ticket.
--  2. A consultant cannot SELECT a ticket assigned to someone else.
--  3. An internal comment is never returned to the raiser, even though
--     they're a participant on the ticket.
--  4. A project editor (PM/technical_lead) sees every ticket on their
--     project regardless of who raised or is assigned to it.
--
-- tickets.raised_by is forced from auth.uid() by the tickets_01_set_ticket_no
-- trigger, so — unlike the plain fixture inserts in rls_smoke_test.sql —
-- the ticket itself must be created *while impersonating the raiser*, not
-- in the unrestricted setup block, or raised_by would come out null.

begin;

-- 1. Fixtures: one hypercare project, an SLA policy, a routing rule
-- (MM -> Consultant X), two super users (raisers), two project members
-- eligible to be consultants, and one project_manager.
do $$
declare
  v_org_id uuid;
  v_project_id uuid;
  v_raiser_a uuid := gen_random_uuid();
  v_raiser_b uuid := gen_random_uuid();
  v_consultant_x uuid := gen_random_uuid();
  v_consultant_y uuid := gen_random_uuid();
  v_pm uuid := gen_random_uuid();
  v_consultant_x_resource uuid;
begin
  select id into v_org_id from organizations order by created_at limit 1;

  insert into projects (id, org_id, name, client_name, code, status, phase)
  values (gen_random_uuid(), v_org_id, 'RLS Ticket Test Project', 'Test Client', 'TIXTEST', 'active', 'hypercare')
  returning id into v_project_id;

  insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
  values
    (v_raiser_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'raiser-a@test.local', now(), now()),
    (v_raiser_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'raiser-b@test.local', now(), now()),
    (v_consultant_x, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'consultant-x@test.local', now(), now()),
    (v_consultant_y, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'consultant-y@test.local', now(), now()),
    (v_pm, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pm@test.local', now(), now());

  insert into profiles (id, org_id, full_name, email)
  values
    (v_raiser_a, v_org_id, 'Raiser A', 'raiser-a@test.local'),
    (v_raiser_b, v_org_id, 'Raiser B', 'raiser-b@test.local'),
    (v_consultant_x, v_org_id, 'Consultant X', 'consultant-x@test.local'),
    (v_consultant_y, v_org_id, 'Consultant Y', 'consultant-y@test.local'),
    (v_pm, v_org_id, 'PM', 'pm@test.local');

  insert into project_members (project_id, profile_id, role, allocation_pct)
  values
    (v_project_id, v_raiser_a, 'super_user', 0),
    (v_project_id, v_raiser_b, 'super_user', 0),
    (v_project_id, v_consultant_x, 'member', 50),
    (v_project_id, v_consultant_y, 'member', 50),
    (v_project_id, v_pm, 'project_manager', 50);

  insert into sla_policies (project_id, criticality, response_mins, resolve_mins)
  values (v_project_id, 'P2_high', 240, 1440);

  -- support_routing references resources, not profiles
  -- (0031_routing_uses_resources.sql) — routing works off the roster
  -- entry, resolved to a login (or not) at ticket-creation time.
  insert into resources (org_id, full_name, email, profile_id, invite_status, created_by)
  values (v_org_id, 'Consultant X', 'consultant-x@test.local', v_consultant_x, 'invited', v_pm)
  returning id into v_consultant_x_resource;

  insert into support_routing (project_id, module, primary_consultant_id, is_active)
  values (v_project_id, 'MM', v_consultant_x_resource, true);

  create temporary table if not exists rls_test_ids (k text primary key, v uuid);
  insert into rls_test_ids values
    ('project_id', v_project_id),
    ('raiser_a', v_raiser_a),
    ('raiser_b', v_raiser_b),
    ('consultant_x', v_consultant_x),
    ('consultant_y', v_consultant_y),
    ('pm', v_pm)
  on conflict (k) do update set v = excluded.v;
end $$;

-- 2. Raise a ticket as Raiser A (impersonated, so the raised_by-forcing
-- trigger and auto-routing both see the right auth.uid()). Module 'MM' has
-- an active routing rule -> auto-assigns to Consultant X.
select set_config('request.jwt.claims', json_build_object('sub', (select v from rls_test_ids where k = 'raiser_a')::text, 'role', 'authenticated')::text, true);
set local role authenticated;

with ins as (
  insert into tickets (project_id, module, criticality, subject, description)
  values ((select v from rls_test_ids where k = 'project_id'), 'MM', 'P2_high', 'Test incident', 'RLS smoke test fixture')
  returning id
)
insert into rls_test_ids (k, v) select 'ticket_id', id from ins
on conflict (k) do update set v = excluded.v;

reset role;

select
  case when (select assigned_to from tickets where id = (select v from rls_test_ids where k = 'ticket_id')) = (select v from rls_test_ids where k = 'consultant_x')
    then 'PASS: ticket auto-routed to the mapped consultant'
    else 'FAIL: auto-routing did not assign the expected consultant'
  end as result;

-- 3. Consultant X (assigned) adds an internal comment.
select set_config('request.jwt.claims', json_build_object('sub', (select v from rls_test_ids where k = 'consultant_x')::text, 'role', 'authenticated')::text, true);
set local role authenticated;

insert into ticket_comments (ticket_id, body, is_internal)
values ((select v from rls_test_ids where k = 'ticket_id'), 'Internal triage note', true);

reset role;

-- 4. Raiser B (a different super user on the same project) must not see
-- Raiser A's ticket.
select set_config('request.jwt.claims', json_build_object('sub', (select v from rls_test_ids where k = 'raiser_b')::text, 'role', 'authenticated')::text, true);
set local role authenticated;

select
  case when count(*) = 0 then 'PASS: super user cannot see another super user''s ticket' else 'FAIL: cross-raiser ticket leaked' end as result
from tickets
where id = (select v from rls_test_ids where k = 'ticket_id');

reset role;

-- 5. Consultant Y (project member, NOT assigned) must not see the ticket.
select set_config('request.jwt.claims', json_build_object('sub', (select v from rls_test_ids where k = 'consultant_y')::text, 'role', 'authenticated')::text, true);
set local role authenticated;

select
  case when count(*) = 0 then 'PASS: consultant cannot see a ticket assigned to someone else' else 'FAIL: cross-consultant ticket leaked' end as result
from tickets
where id = (select v from rls_test_ids where k = 'ticket_id');

reset role;

-- 6. Raiser A (the raiser, a participant) must still never see the
-- internal comment.
select set_config('request.jwt.claims', json_build_object('sub', (select v from rls_test_ids where k = 'raiser_a')::text, 'role', 'authenticated')::text, true);
set local role authenticated;

select
  case when count(*) = 0 then 'PASS: internal comment hidden from the raiser' else 'FAIL: internal comment leaked to raiser' end as result
from ticket_comments
where ticket_id = (select v from rls_test_ids where k = 'ticket_id') and is_internal;

reset role;

-- 7. The project manager (editor) sees the ticket regardless of who raised
-- or is assigned to it.
select set_config('request.jwt.claims', json_build_object('sub', (select v from rls_test_ids where k = 'pm')::text, 'role', 'authenticated')::text, true);
set local role authenticated;

select
  case when count(*) = 1 then 'PASS: project editor sees every ticket on their project' else 'FAIL: project editor cannot see project ticket' end as result
from tickets
where id = (select v from rls_test_ids where k = 'ticket_id');

reset role;

rollback; -- discard all test fixtures, including the seeded rows above

-- Table-level GRANTs for the PostgREST roles.
--
-- RLS policies (0003_rls.sql) only restrict *which rows* a role may touch —
-- Postgres still requires a base GRANT before it evaluates RLS at all.
-- Supabase-hosted projects get baseline CRUD grants to anon/authenticated
-- wired in by the platform when tables are created via the dashboard; a
-- schema written by hand (as here) doesn't get that for free, so every
-- query 403s until it's added explicitly.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
-- anon has no profile/session, so RLS denies it everywhere in practice —
-- granted for consistency rather than because it needs write access.
grant select on all tables in schema public to anon;

grant usage, select on all sequences in schema public to authenticated, service_role;

grant execute on all functions in schema public to anon, authenticated, service_role;

-- Apply the same defaults to anything created by later migrations.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

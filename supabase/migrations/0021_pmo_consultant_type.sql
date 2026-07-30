-- PMO becomes a third consultant_type on the resource roster (Resources
-- page), alongside functional/technical — a roster-level classification,
-- distinct from the per-project "pmo" role added in migration 0018
-- (project_members.role), though inviting a PMO-tagged resource now
-- defaults to that same project role so they land in the weekly digest's
-- existing recipient query (see lib/jobs/weekly-digest.ts).

alter table resources drop constraint if exists resources_consultant_type_check;
alter table resources add constraint resources_consultant_type_check
  check (consultant_type in ('functional', 'technical', 'pmo'));

alter table profiles drop constraint if exists profiles_consultant_type_check;
alter table profiles add constraint profiles_consultant_type_check
  check (consultant_type in ('functional', 'technical', 'pmo'));

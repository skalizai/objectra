-- Resource roles (Functional/Technical/PMO/Project Manager/etc.) become an
-- org-managed picklist — Settings → Project Roles — instead of a fixed
-- consultant_type enum. resources.consultant_type and profiles.consultant_type
-- are now free text, validated against picklists(type='project_role') at the
-- app layer, same pattern already used for object status (see
-- lib/object-meta.ts).

alter table resources drop constraint if exists resources_consultant_type_check;
alter table profiles drop constraint if exists profiles_consultant_type_check;

alter table picklists drop constraint if exists picklists_type_check;
alter table picklists add constraint picklists_type_check
  check (type in ('module', 'complexity', 'status', 'company_code', 'stream', 'project_role'));

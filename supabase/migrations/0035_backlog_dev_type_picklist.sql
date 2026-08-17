-- Backlog item "Type" (Enhancement/Workflow/Interface/Report/Form/Fiori/
-- Configuration/User Exit/BAdI/Function Module) becomes an org-managed
-- picklist -- Settings -> "Backlog item types" -- same pattern as modules/
-- complexity/company codes/streams/project roles (0006, 0021).

alter table picklists drop constraint if exists picklists_type_check;
alter table picklists add constraint picklists_type_check
  check (type in ('module', 'complexity', 'status', 'company_code', 'stream', 'project_role', 'dev_type'));

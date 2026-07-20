-- status is now a free-text value validated against the org's status
-- picklist at the application layer, not a fixed DB enum — admins maintain
-- the list themselves in Settings.
-- Values are now free-text labels matching picklists(type='status').value
-- directly (e.g. "Process/Pending"), not the old fixed slugs.
alter table objects drop constraint if exists objects_status_check;
alter table objects alter column status set default 'Process/Pending';

alter table objects add column fds_received boolean not null default false;

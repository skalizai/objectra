-- Weekly digest gets two new admin-configurable controls (Settings ->
-- Notifications): which statuses to scope the whole digest to (empty =
-- every status, unchanged behavior), and PMO split out of the "Team"
-- recipient bucket into its own toggle so it can be turned off
-- independently.
alter table notification_settings add column digest_statuses text[] not null default '{}';

alter table notification_settings
  alter column digest_recipients set default '{"pms": true, "pmo": true, "clients": true}'::jsonb;

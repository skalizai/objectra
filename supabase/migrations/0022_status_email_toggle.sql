-- Replaces the hard-coded STATUS_TRIGGERS list in
-- lib/email/notify-status-change.ts with an admin-configurable toggle per
-- status (Settings → Object statuses → "Email" checkbox): moving an object
-- into a status with notify_email=true emails its assigned consultants.
alter table picklists add column notify_email boolean not null default false;

-- Per-resource opt-out for those status-change emails specifically (Add/Edit
-- resource → "Email" checkbox) — defaults true so existing resources keep
-- receiving them exactly as before this column existed.
alter table resources add column email_notifications_enabled boolean not null default true;

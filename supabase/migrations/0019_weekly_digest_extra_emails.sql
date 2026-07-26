-- Lets an admin add extra email addresses (people outside the org — e.g.
-- external stakeholders) that receive the weekly digest alongside PM/
-- Technical Lead/PMO/Member/Client, configured per-project in Settings.
alter table notification_settings add column extra_digest_emails text[] not null default '{}';

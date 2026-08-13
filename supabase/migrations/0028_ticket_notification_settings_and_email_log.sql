-- New ticket email types (section 18) + the two new per-project toggles.

alter table email_log drop constraint if exists email_log_type_check;
alter table email_log add constraint email_log_type_check
  check (type in (
    'invite', 'deadline_alert', 'weekly_digest', 'status_change',
    'ticket_created', 'ticket_assigned', 'ticket_status', 'sla_alert'
  ));

alter table notification_settings add column ticket_emails_enabled boolean not null default true;
alter table notification_settings add column sla_alerts_enabled boolean not null default true;

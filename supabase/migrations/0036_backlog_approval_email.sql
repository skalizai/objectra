-- Backlog approval-request email plumbing -- same shape as the ticket
-- email toggle (0028) and every prior email_log.type widening (0018, 0028,
-- 0032).

alter table notification_settings add column backlog_emails_enabled boolean not null default true;

alter table email_log drop constraint if exists email_log_type_check;
alter table email_log add constraint email_log_type_check
  check (type in (
    'invite', 'deadline_alert', 'weekly_digest', 'status_change',
    'ticket_created', 'ticket_assigned', 'ticket_status', 'sla_alert', 'sla_escalation',
    'backlog_approval_request'
  ));

-- "Development completed" Yes/No field on backlog items, alongside
-- go_live_critical -- same boolean shape.

alter table backlog_items add column dev_completed boolean not null default false;

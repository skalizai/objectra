-- Backlog Items simplified to effort-in-days tracking only (Dev/Functional/
-- Fiori days) -- the cost/rate-card layer (0034) is removed at the user's
-- request: no rate card, no Dev/Fiori/Functional/PMO/PGLS cost figures
-- anywhere in the Backlog tab, Settings, or the approval email. Effort
-- days themselves (dev_days/fiori_days/func_days) stay -- those are what
-- the register and the client approval email now show.

drop table if exists backlog_rate_settings;

alter table backlog_items drop column if exists dev_hours;
alter table backlog_items drop column if exists dev_cost;
alter table backlog_items drop column if exists fiori_hours;
alter table backlog_items drop column if exists fiori_cost;
alter table backlog_items drop column if exists func_hours;
alter table backlog_items drop column if exists func_cost;

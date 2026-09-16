begin;

-- The Settings -> "Object status emails" extra-recipients feature (0048)
-- is removed: object status/assignment email CC is now strictly the
-- project's PM + Technical Lead (projects.pm_id / technical_lead_id), and
-- this table is no longer read anywhere in the app.
drop table if exists object_status_email_recipients;

commit;

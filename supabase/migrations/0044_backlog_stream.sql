-- Fixed 2-value "Wave 1"/"Wave 2" stream field on backlog items -- same
-- fixed-values-not-a-picklist shape as package (0038_backlog_package.sql).

alter table backlog_items add column stream text check (stream in ('Wave 1', 'Wave 2'));

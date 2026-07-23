-- Company Code and Stream: project-level defaults, and per-object values so
-- each object records which company code/stream it belongs to (a project
-- can legitimately span more than one of either, mirroring how a real
-- WRICEF tracker carries company_code per row, not just per project).

alter table projects add column company_code text;
alter table projects add column stream text;

-- objects.company_code already exists (section 4 of the original schema);
-- stream is new.
alter table objects add column stream text;

-- Extend the org-managed picklist types (Settings) to cover both — same
-- pattern as modules/complexity/status.
alter table picklists drop constraint if exists picklists_type_check;
alter table picklists add constraint picklists_type_check
  check (type in ('module', 'complexity', 'status', 'company_code', 'stream'));

-- Add stream to the client-safe view too (harmless rollout context);
-- company_code stays out, matching the view's existing internal-SAP-detail
-- exclusions. CREATE OR REPLACE can append columns without dropping the
-- view, as long as existing columns keep their position/type.
create or replace view client_object_view
with (security_invoker = on)
as
select
  id,
  project_id,
  wricef_id,
  object_type,
  title,
  module,
  wave,
  sprint,
  status,
  priority,
  go_live_critical,
  due_date,
  planned_fsd,
  dev_planned,
  dev_actual,
  created_at,
  updated_at,
  stream
from objects;

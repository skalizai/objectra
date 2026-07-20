-- Client-safe read surface: excludes internal-only fields (admin_note,
-- comments, comments2, transport/customizing details, uploaded_path) so the
-- Client view UI queries a source that structurally cannot return them,
-- rather than relying on the UI alone to hide columns. Row visibility is
-- still governed by the underlying objects_select RLS policy — a security
-- invoker view runs with the querying user's own privileges/RLS, not the
-- view owner's.
create view client_object_view
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
  updated_at
from objects;

grant select on client_object_view to authenticated;

-- tickets never had a DELETE policy (0026_tickets.sql only defined
-- select/insert/update) — RLS denies by default with no matching policy,
-- so nobody could delete a ticket at all. PM/technical_lead/org_admin get
-- the same "full write access" scope here as they already have for
-- UPDATE (reassign, re-route, criticality, close/reopen).

create policy tickets_delete on tickets
  for delete using (is_org_admin() or is_project_editor(project_id));

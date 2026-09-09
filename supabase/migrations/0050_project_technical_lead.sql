begin;

-- Technical Lead becomes a resource-roster field on the project, exactly
-- like pm_id (migration 0016) -- editable from Settings without requiring
-- an invite/login, and no longer dependent on someone being added as an
-- invited project_members row with role='technical_lead'. That older
-- project_members-based lookup is what silently produced an empty
-- Technical Lead CC list on object emails whenever no one had actually
-- been invited into that role yet.
--
-- if not exists: this column already exists on this database (added
-- out-of-band, ahead of this tracked migration) -- kept idempotent so this
-- migration is still safe to run on a fresh environment that doesn't have
-- it yet.
alter table projects
  add column if not exists technical_lead_id uuid references resources (id) on delete set null;

commit;

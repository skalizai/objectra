-- Allow multiple resources to share the same email (some orgs legitimately
-- reuse a contact address across roster entries) and restrict roster
-- writes to org_admin only — project managers/technical leads could
-- previously edit/invite/delete resources too.

alter table resources drop constraint if exists resources_org_id_email_key;

drop policy if exists resources_write on resources;
create policy resources_write on resources
  for all using (is_org_admin() and org_id = current_org_id())
  with check (is_org_admin() and org_id = current_org_id());

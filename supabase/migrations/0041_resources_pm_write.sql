-- Reopens roster management (add/edit/delete/invite resources) to Project
-- Managers and Technical Leads, not just org_admin. 0017 had restricted
-- this to org_admin only; the user now wants PMs able to manage their own
-- project's roster again -- same shape 0012_technical_lead_role.sql already
-- used for this exact policy before 0017 tightened it.

drop policy if exists resources_write on resources;
create policy resources_write on resources
  for all using (
    is_org_admin()
    or (
      org_id = current_org_id()
      and exists (
        select 1 from project_members pm
        where pm.profile_id = auth.uid()
          and pm.role in ('project_manager', 'technical_lead')
          and pm.is_active
      )
    )
  )
  with check (
    is_org_admin()
    or (
      org_id = current_org_id()
      and exists (
        select 1 from project_members pm
        where pm.profile_id = auth.uid()
          and pm.role in ('project_manager', 'technical_lead')
          and pm.is_active
      )
    )
  );

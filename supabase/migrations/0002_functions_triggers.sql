-- updated_at maintenance + new-user provisioning

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on organizations
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on projects
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on project_members
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on objects
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on object_assignments
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on invitations
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on email_log
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on notification_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- handle_new_user — provisions a profiles row on signup.
--
-- org_id / full_name / is_org_admin are read from auth user metadata, which
-- is populated either by supabase.auth.admin.generateLink({ type: 'invite',
-- data: {...} }) during the invite flow, or by the seed script for the first
-- org_admin. Falls back to the single seeded org for local/dev bootstrapping.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org_id uuid;
begin
  target_org_id := (new.raw_user_meta_data ->> 'org_id')::uuid;
  if target_org_id is null then
    select id into target_org_id from public.organizations order by created_at asc limit 1;
  end if;

  insert into public.profiles (id, org_id, full_name, email, is_org_admin)
  values (
    new.id,
    target_org_id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'is_org_admin')::boolean, false)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- accept_invitation — consumes a pending invitation after the invitee has
-- set their password, creating project_members (and, for previously staged
-- object_assignments referencing the invite's email, nothing to move since
-- assignments are keyed by profile_id — see invite_resource()) and marking
-- the invite accepted. Runs as the invited user via RPC.
-- ---------------------------------------------------------------------------
create or replace function public.accept_invitation(p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inv invitations;
begin
  select * into inv from invitations where token = p_token and status = 'pending';

  if inv is null then
    raise exception 'Invitation not found or already used';
  end if;

  if inv.expires_at < now() then
    update invitations set status = 'expired' where id = inv.id;
    raise exception 'Invitation has expired';
  end if;

  if lower(inv.email) <> lower((select email from auth.users where id = auth.uid())) then
    raise exception 'Invitation email does not match the signed-in account';
  end if;

  if inv.role = 'org_admin' then
    update profiles set is_org_admin = true where id = auth.uid();
  elsif inv.project_id is not null then
    insert into project_members (project_id, profile_id, role, allocation_pct)
    values (inv.project_id, auth.uid(), inv.role, inv.allocation_pct)
    on conflict (project_id, profile_id)
    do update set role = excluded.role, allocation_pct = excluded.allocation_pct, is_active = true;
  end if;

  update invitations set status = 'accepted' where id = inv.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- member_update_object — lets a member update only status/admin_note/
-- comments/comments2 on objects assigned to them, and records the change in
-- audit_log. Server-side column guard referenced in section 5.
-- ---------------------------------------------------------------------------
create or replace function public.member_update_object(
  p_object_id uuid,
  p_status text default null,
  p_admin_note text default null,
  p_comments text default null,
  p_comments2 text default null
)
returns objects
language plpgsql
security definer
set search_path = public
as $$
declare
  obj objects;
begin
  if not exists (
    select 1 from object_assignments
    where object_id = p_object_id and profile_id = auth.uid()
  ) then
    raise exception 'Not assigned to this object';
  end if;

  select * into obj from objects where id = p_object_id;

  if p_status is not null and p_status is distinct from obj.status then
    insert into audit_log (object_id, field, old_value, new_value, changed_by)
    values (p_object_id, 'status', obj.status, p_status, auth.uid());
  end if;
  if p_admin_note is not null and p_admin_note is distinct from obj.admin_note then
    insert into audit_log (object_id, field, old_value, new_value, changed_by)
    values (p_object_id, 'admin_note', obj.admin_note, p_admin_note, auth.uid());
  end if;
  if p_comments is not null and p_comments is distinct from obj.comments then
    insert into audit_log (object_id, field, old_value, new_value, changed_by)
    values (p_object_id, 'comments', obj.comments, p_comments, auth.uid());
  end if;
  if p_comments2 is not null and p_comments2 is distinct from obj.comments2 then
    insert into audit_log (object_id, field, old_value, new_value, changed_by)
    values (p_object_id, 'comments2', obj.comments2, p_comments2, auth.uid());
  end if;

  update objects set
    status = coalesce(p_status, status),
    admin_note = coalesce(p_admin_note, admin_note),
    comments = coalesce(p_comments, comments),
    comments2 = coalesce(p_comments2, comments2),
    updated_by = auth.uid()
  where id = p_object_id
  returning * into obj;

  return obj;
end;
$$;

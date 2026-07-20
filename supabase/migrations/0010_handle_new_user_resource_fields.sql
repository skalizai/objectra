-- handle_new_user() now also copies the resource fields captured at invite
-- time (consultant_type, primary_module, location) from auth user metadata
-- onto the new profile — mirrors how org_id/full_name/is_org_admin already
-- flow through raw_user_meta_data.
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

  insert into public.profiles (
    id, org_id, full_name, email, is_org_admin, title, consultant_type, primary_module, location
  )
  values (
    new.id,
    target_org_id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'is_org_admin')::boolean, false),
    new.raw_user_meta_data ->> 'role_title',
    nullif(new.raw_user_meta_data ->> 'consultant_type', ''),
    nullif(new.raw_user_meta_data ->> 'primary_module', ''),
    nullif(new.raw_user_meta_data ->> 'location', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

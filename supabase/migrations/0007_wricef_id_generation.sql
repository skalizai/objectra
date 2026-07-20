-- Auto-generated WRICEF IDs: <PROJECT4><MODULE>-<CATEGORY3>-<seq4>, e.g.
-- ACME-MM-WOR-0001. The sequence is scoped per (project, module, object
-- type) so each combination counts independently, matching how the ID
-- itself is composed. Only fills in when the caller didn't already supply
-- one (the .xlsx importer keeps each row's original tracker ID).

create table wricef_sequences (
  project_id uuid not null references projects (id) on delete cascade,
  module text not null,
  category text not null,
  next_seq int not null default 1,
  primary key (project_id, module, category)
);

create or replace function public.generate_wricef_id(
  p_project_id uuid,
  p_module text,
  p_object_type text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_code text;
  v_module_code text;
  v_category text;
  v_seq int;
begin
  select upper(left(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g'), 4))
    into v_project_code
  from projects where id = p_project_id;

  v_module_code := upper(coalesce(nullif(trim(p_module), ''), 'GEN'));
  v_category := upper(left(coalesce(p_object_type, 'GEN'), 3));

  insert into wricef_sequences (project_id, module, category, next_seq)
  values (p_project_id, v_module_code, v_category, 2)
  on conflict (project_id, module, category)
    do update set next_seq = wricef_sequences.next_seq + 1
  returning next_seq - 1 into v_seq;

  return coalesce(v_project_code, 'GEN') || '-' || v_module_code || '-' || v_category || '-' || lpad(v_seq::text, 4, '0');
end;
$$;

create or replace function public.objects_set_wricef_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.wricef_id is null or trim(new.wricef_id) = '' then
    new.wricef_id := public.generate_wricef_id(new.project_id, new.module, new.object_type);
  end if;
  return new;
end;
$$;

create trigger objects_set_wricef_id before insert on objects
  for each row execute function public.objects_set_wricef_id();

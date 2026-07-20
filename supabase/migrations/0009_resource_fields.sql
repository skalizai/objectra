-- Extra fields captured when an admin adds a resource: consultant type,
-- primary module/area, and onsite/offshore location. `title` (already on
-- profiles) doubles as the "role" field.
alter table profiles add column consultant_type text check (consultant_type in ('functional', 'technical'));
alter table profiles add column primary_module text;
alter table profiles add column location text check (location in ('onsite', 'offshore'));

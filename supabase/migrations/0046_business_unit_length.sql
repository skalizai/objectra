-- Widens the business_unit cap from 10 to 15 characters.

alter table objects drop constraint if exists objects_business_unit_length;
alter table objects add constraint objects_business_unit_length
  check (char_length(business_unit) <= 15);

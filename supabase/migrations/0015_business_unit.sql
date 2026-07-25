-- Business Unit: a free-text tag on objects, shown in the register next to
-- Company Code. Capped at 10 characters — short codes like "US10"/"SALES",
-- not a full name — enforced in the DB as well as the form input.

alter table objects add column business_unit text;
alter table objects add constraint objects_business_unit_length
  check (char_length(business_unit) <= 10);

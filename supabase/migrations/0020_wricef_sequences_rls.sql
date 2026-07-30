-- wricef_sequences was created in 0007 without RLS, leaving it publicly
-- readable/writable to anyone with the project URL. It's only ever touched
-- internally by generate_wricef_id() (security definer, bypasses RLS), so
-- no policies are needed — this just closes direct client access.

alter table wricef_sequences enable row level security;

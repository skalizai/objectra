-- ticket-attachments storage bucket (section 16/19) — private, participant-
-- gated file storage for ticket attachments.
--
-- Two-phase upload (no existing storage-bucket precedent in this codebase
-- to follow — this is net-new): a ticket doesn't exist yet at the point the
-- raise-ticket form lets someone attach a file, so uploads first land under
-- a "pending" prefix keyed only by project + a client-generated draft id,
-- then lib/actions/tickets.ts::createTicket (service-role client, bypasses
-- RLS) moves them under the ticket's own id once it exists. Comment
-- attachments added after the ticket exists go straight to the final path.
--   pending: ticket-attachments/<project_id>/pending/<draft_id>/<filename>
--   final:   ticket-attachments/<project_id>/<ticket_id>/<filename>

insert into storage.buckets (id, name, public)
values ('ticket-attachments', 'ticket-attachments', false)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

create policy ticket_attachments_insert_pending on storage.objects
  for insert with check (
    bucket_id = 'ticket-attachments'
    and (storage.foldername(name))[2] = 'pending'
    and is_project_member(((storage.foldername(name))[1])::uuid)
  );

create policy ticket_attachments_select_pending on storage.objects
  for select using (
    bucket_id = 'ticket-attachments'
    and (storage.foldername(name))[2] = 'pending'
    and is_project_member(((storage.foldername(name))[1])::uuid)
  );

create policy ticket_attachments_delete_pending on storage.objects
  for delete using (
    bucket_id = 'ticket-attachments'
    and (storage.foldername(name))[2] = 'pending'
    and is_project_member(((storage.foldername(name))[1])::uuid)
  );

-- Final path: mirrors ticket SELECT exactly — only ticket participants can
-- read or add files once the ticket exists (e.g. attaching a file to a
-- comment).
create policy ticket_attachments_select_final on storage.objects
  for select using (
    bucket_id = 'ticket-attachments'
    and (storage.foldername(name))[2] <> 'pending'
    and is_ticket_participant(((storage.foldername(name))[2])::uuid)
  );

create policy ticket_attachments_insert_final on storage.objects
  for insert with check (
    bucket_id = 'ticket-attachments'
    and (storage.foldername(name))[2] <> 'pending'
    and is_ticket_participant(((storage.foldername(name))[2])::uuid)
  );

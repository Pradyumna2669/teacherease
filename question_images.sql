-- ============================================================
-- Image questions: storage bucket + access policies.
--
-- The object is named after the question it belongs to, so the
-- image can be located from the question row alone:
--     question-images/<question_id>.<ext>
-- The full object path is still persisted in questions.image_url,
-- because the extension varies and guessing it would mean probing
-- the bucket on every read.
--
-- The bucket is PRIVATE. Question images are part of the paper and
-- carry the same confidentiality as the question text, so they are
-- read through short-lived signed URLs, never a public URL.
--
-- Run in the Supabase SQL editor. Idempotent.
-- ============================================================

begin;

-- 1. Bucket -----------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit,
                             allowed_mime_types)
values ('question-images', 'question-images', false, 5242880,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Access -----------------------------------------------------
-- Signed URLs are issued against the caller's own read permission,
-- so authenticated users need select. Anonymous users get nothing.
drop policy if exists question_images_read on storage.objects;
create policy question_images_read on storage.objects
  for select to authenticated
  using (bucket_id = 'question-images');

drop policy if exists question_images_write on storage.objects;
create policy question_images_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'question-images');

drop policy if exists question_images_update on storage.objects;
create policy question_images_update on storage.objects
  for update to authenticated
  using (bucket_id = 'question-images')
  with check (bucket_id = 'question-images');

drop policy if exists question_images_delete on storage.objects;
create policy question_images_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'question-images');

-- 3. Column -----------------------------------------------------
-- Already present in most installs; kept here so a fresh database
-- built from these files alone is complete.
alter table public.questions
  add column if not exists image_url text;

comment on column public.questions.image_url is
  'Object path inside the question-images bucket, named <question_id>.<ext>. '
  'Null when the question has no image.';

-- 4. Housekeeping -----------------------------------------------
-- Deleting a question leaves its image orphaned in the bucket.
-- Storage objects cannot be removed from SQL, so record the orphan
-- in the audit log and clear it out with a periodic job.
create or replace function public.audit_question_image_del()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.image_url is not null then
    perform public.log_audit(
      'question.image_orphan', 'question', old.id,
      format('Image %s orphaned by deletion of its question', old.image_url),
      jsonb_build_object('image_url', old.image_url));
  end if;
  return old;
end $$;

drop trigger if exists trg_audit_question_image_del on public.questions;
create trigger trg_audit_question_image_del
  before delete on public.questions
  for each row execute function public.audit_question_image_del();

commit;

select count(*) filter (where image_url is not null) as with_image,
       count(*) as total
from public.questions;

-- ============================================================
-- Move the seeded Trees & Graphs questions into the existing
-- Data Structures bank, then remove the subject the seed created.
--
--   from : CS/AI/ML301PCC01   (created by seed_ds_images.sql)
--   to   : CS/AI/ML302PCC03   (your real DS subject)
--
-- Images are safe. The object is named after the question id, and
-- the id does not change when the row moves to another subject,
-- so image_url keeps pointing at the same file in the bucket.
--
-- Run in the Supabase SQL editor. Idempotent: running it twice
-- does nothing the second time.
-- ============================================================
begin;

do $$
declare
  v_from uuid;
  v_to   uuid;
  n_dup  int;
  n_move int;
begin
  select id into v_from from public.subjects where code = 'CS/AI/ML301PCC01';
  select id into v_to   from public.subjects where code = 'CS/AI/ML302PCC03';

  if v_to is null then
    raise exception 'Target subject CS/AI/ML302PCC03 not found. Check the code and retry.';
  end if;

  if v_from is null then
    raise notice 'Source subject already removed - nothing to move.';
    return;
  end if;

  -- 1. Drop seeded questions whose text already exists in the target bank,
  --    so the move cannot create duplicates.
  with dup as (
    delete from public.questions q
    where q.subject_id = v_from
      and exists (
        select 1 from public.questions t
        where t.subject_id = v_to and t.text = q.text
      )
    returning 1
  )
  select count(*) into n_dup from dup;

  -- 2. Move the rest. subject_id is the only thing that changes -
  --    unit_no, marks, co_no, bt_level and image_url all travel with the row.
  with moved as (
    update public.questions
    set subject_id = v_to
    where subject_id = v_from
    returning 1
  )
  select count(*) into n_move from moved;

  -- 3. Clear anything else that hung off the temporary subject.
  delete from public.paper_questions
   where paper_id in (select id from public.papers where subject_id = v_from);
  delete from public.papers           where subject_id = v_from;
  delete from public.exam_cycles      where subject_id = v_from;
  delete from public.teacher_subjects where subject_id = v_from;
  delete from public.paper_formats    where subject_id = v_from;   -- subject-specific only
  delete from public.subjects         where id = v_from;

  -- 4. Record it. This bypasses delete_subject(), so write the entry by hand.
  perform public.log_audit(
    'subject.delete', 'subject', v_from,
    format('Merged CS/AI/ML301PCC01 into CS/AI/ML302PCC03 - %s questions moved, '
           '%s duplicates dropped', n_move, n_dup),
    jsonb_build_object('moved', n_move, 'duplicates_dropped', n_dup,
                       'target_code', 'CS/AI/ML302PCC03'));

  raise notice 'Moved % questions, dropped % duplicates.', n_move, n_dup;
end $$;

commit;

-- ---------- check what the DS bank now holds ----------
select unit_no,
       marks,
       count(*)                                        as questions,
       count(*) filter (where image_url is not null)    as with_image
from public.questions
where subject_id = (select id from public.subjects where code = 'CS/AI/ML302PCC03')
  and is_active
group by unit_no, marks
order by unit_no, marks;

-- ---------- the 12 image questions, to confirm they came across ----------
select q.unit_no, q.marks, q.image_url, left(q.text, 55) || '...' as question
from public.questions q
join public.subjects s on s.id = q.subject_id
where s.code = 'CS/AI/ML302PCC03' and q.image_url is not null
order by q.unit_no, q.image_url;

-- ------------------------------------------------------------
-- If Trees and Graphs are different unit numbers in your syllabus,
-- remap them here. The seed used Unit 4 = Trees, Unit 5 = Graphs.
--
-- update public.questions set unit_no = <trees_unit>
-- where subject_id = (select id from public.subjects where code = 'CS/AI/ML302PCC03')
--   and unit_no = 4;
--
-- update public.questions set unit_no = <graphs_unit>
-- where subject_id = (select id from public.subjects where code = 'CS/AI/ML302PCC03')
--   and unit_no = 5;
-- ------------------------------------------------------------

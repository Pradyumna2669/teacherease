-- ============================================================
-- TeacherEase — admin features: audit log, subject deletion,
-- admin-wide visibility of generated papers.
--
-- Run in the Supabase SQL editor of project dfkpsipqdkbrknxmtzmh.
-- Idempotent: safe to run more than once.
--
-- Design notes
--   * audit_logs holds NO foreign keys to the entities it records.
--     A FK to subjects would cascade-delete the very row that proves
--     the subject was deleted. Identity is kept as a plain uuid plus a
--     denormalised snapshot in `details`.
--   * Clients can never INSERT into audit_logs. Rows are written only by
--     SECURITY DEFINER triggers and functions, so the log cannot be
--     forged or skipped by calling the REST API directly.
--   * audit_logs has no UPDATE or DELETE policy for anyone. Append-only.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Role helper
--    SECURITY DEFINER so it bypasses RLS on profiles — otherwise a
--    policy on profiles that calls is_admin() would recurse.
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ------------------------------------------------------------
-- 2. Audit log table
-- ------------------------------------------------------------
create table if not exists public.audit_logs (
  id          bigserial primary key,
  at          timestamptz not null default now(),  -- when
  actor_id    uuid,                                -- who (null = SQL editor / system)
  actor_email text,
  actor_role  text,
  action      text not null,        -- 'subject.delete', 'paper.generate', ...
  entity      text not null,        -- 'subject' | 'paper' | 'question' | 'allotment'
  entity_id   uuid,                 -- deliberately NOT a foreign key
  summary     text,                 -- one human-readable line
  details     jsonb                 -- snapshot + counts, survives deletion
);

create index if not exists audit_logs_at_idx     on public.audit_logs (at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity, entity_id);

alter table public.audit_logs enable row level security;

-- Admins read. Nobody writes, updates or deletes through the API:
-- the absence of those policies is the enforcement.
drop policy if exists audit_logs_admin_select on public.audit_logs;
create policy audit_logs_admin_select on public.audit_logs
  for select using (public.is_admin());

-- ------------------------------------------------------------
-- 3. Writer used by every trigger and RPC below
-- ------------------------------------------------------------
create or replace function public.log_audit(
  p_action  text,
  p_entity  text,
  p_id      uuid,
  p_summary text,
  p_details jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_role  text;
begin
  select u.email into v_email from auth.users u where u.id = auth.uid();
  select p.role  into v_role  from public.profiles p where p.id = auth.uid();

  insert into public.audit_logs
    (actor_id, actor_email, actor_role, action, entity, entity_id, summary, details)
  values
    (auth.uid(), v_email, v_role, p_action, p_entity, p_id, p_summary, p_details);
end;
$$;

-- ------------------------------------------------------------
-- 4. Automatic logging via triggers
--    Triggers, not client-side calls: the log cannot be bypassed by a
--    client that "forgets" to write it, and paper generation gets logged
--    without touching generate_paper().
-- ------------------------------------------------------------

-- subjects: created
create or replace function public.audit_subject_ins()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.log_audit(
    'subject.create', 'subject', new.id,
    format('Created subject %s — %s', new.code, new.name),
    jsonb_build_object('code', new.code, 'name', new.name, 'semester', new.semester));
  return new;
end $$;

drop trigger if exists trg_audit_subject_ins on public.subjects;
create trigger trg_audit_subject_ins
  after insert on public.subjects
  for each row execute function public.audit_subject_ins();

-- papers: generated
create or replace function public.audit_paper_ins()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_code text; v_cycle text;
begin
  select code into v_code  from public.subjects    where id = new.subject_id;
  select name into v_cycle from public.exam_cycles where id = new.cycle_id;
  perform public.log_audit(
    'paper.generate', 'paper', new.id,
    format('Generated %s paper "%s" for %s (%s)',
           coalesce(new.variant, '?'), coalesce(new.title, 'untitled'),
           coalesce(v_code, '?'), coalesce(v_cycle, 'no cycle')),
    jsonb_build_object('subject_code', v_code, 'cycle', v_cycle,
                       'variant', new.variant, 'total_marks', new.total_marks));
  return new;
end $$;

drop trigger if exists trg_audit_paper_ins on public.papers;
create trigger trg_audit_paper_ins
  after insert on public.papers
  for each row execute function public.audit_paper_ins();

-- questions: hard-deleted from the bank
create or replace function public.audit_question_del()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Skip rows removed as part of a subject deletion; that RPC logs one
  -- summary row instead of hundreds of individual ones.
  if current_setting('teacherease.bulk_delete', true) = 'on' then
    return old;
  end if;
  perform public.log_audit(
    'question.delete', 'question', old.id,
    format('Deleted question (Unit %s, %s marks)', old.unit_no, old.marks),
    jsonb_build_object('unit_no', old.unit_no, 'marks', old.marks,
                       'text', old.text, 'subject_id', old.subject_id));
  return old;
end $$;

drop trigger if exists trg_audit_question_del on public.questions;
create trigger trg_audit_question_del
  before delete on public.questions
  for each row execute function public.audit_question_del();

-- teacher_subjects: allotment granted / revoked
create or replace function public.audit_allotment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_code text; v_teacher text; v_row record;
begin
  v_row := coalesce(new, old);
  select code      into v_code    from public.subjects where id = v_row.subject_id;
  select full_name into v_teacher from public.profiles where id = v_row.teacher_id;

  if tg_op = 'INSERT' then
    perform public.log_audit('allotment.grant', 'allotment', v_row.subject_id,
      format('Alloted %s to %s', coalesce(v_code,'?'), coalesce(v_teacher,'teacher')),
      jsonb_build_object('subject_code', v_code, 'teacher_id', v_row.teacher_id));
    return new;
  else
    if current_setting('teacherease.bulk_delete', true) = 'on' then
      return old;
    end if;
    perform public.log_audit('allotment.revoke', 'allotment', v_row.subject_id,
      format('Revoked %s from %s', coalesce(v_code,'?'), coalesce(v_teacher,'teacher')),
      jsonb_build_object('subject_code', v_code, 'teacher_id', v_row.teacher_id));
    return old;
  end if;
end $$;

drop trigger if exists trg_audit_allotment_ins on public.teacher_subjects;
create trigger trg_audit_allotment_ins
  after insert on public.teacher_subjects
  for each row execute function public.audit_allotment();

drop trigger if exists trg_audit_allotment_del on public.teacher_subjects;
create trigger trg_audit_allotment_del
  before delete on public.teacher_subjects
  for each row execute function public.audit_allotment();

-- ------------------------------------------------------------
-- 5. Delete preview — what the admin is about to destroy.
--    Read-only. Feeds the confirmation dialog.
-- ------------------------------------------------------------
create or replace function public.subject_delete_preview(p_subject_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v jsonb; v_code text; v_name text;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can delete a subject.';
  end if;

  select code, name into v_code, v_name from public.subjects where id = p_subject_id;
  if v_code is null then
    raise exception 'Subject not found.';
  end if;

  select jsonb_build_object(
    'code', v_code,
    'name', v_name,
    'questions',  (select count(*) from public.questions      where subject_id = p_subject_id),
    'papers',     (select count(*) from public.papers         where subject_id = p_subject_id),
    'cycles',     (select count(*) from public.exam_cycles    where subject_id = p_subject_id),
    'allotments', (select count(*) from public.teacher_subjects where subject_id = p_subject_id),
    'formats',    (select count(*) from public.paper_formats  where subject_id = p_subject_id)
  ) into v;
  return v;
end $$;

-- ------------------------------------------------------------
-- 6. Delete subject
--    * admin only, checked server-side
--    * confirmation checked server-side too: the caller must echo the
--      subject code back exactly. Calling the RPC straight from the API
--      without the code fails the same way the UI would.
--    * whole thing is one transaction — it all goes or nothing goes
--    * counts are captured BEFORE deletion and stored in the audit row,
--      because afterwards there is nothing left to count
-- ------------------------------------------------------------
create or replace function public.delete_subject(
  p_subject_id   uuid,
  p_confirm_code text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code    text;
  v_name    text;
  v_counts  jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can delete a subject.';
  end if;

  select code, name into v_code, v_name
  from public.subjects where id = p_subject_id;

  if v_code is null then
    raise exception 'Subject not found (already deleted?).';
  end if;

  if btrim(coalesce(p_confirm_code, '')) is distinct from v_code then
    raise exception 'Confirmation failed — type the subject code % exactly to delete it.', v_code;
  end if;

  -- Snapshot before anything is destroyed.
  v_counts := public.subject_delete_preview(p_subject_id);

  -- Silence the per-row question/allotment audit triggers for this cascade;
  -- one summary row is written below instead.
  perform set_config('teacherease.bulk_delete', 'on', true);  -- true = transaction-local

  -- Children first, deepest level out.
  delete from public.paper_questions
   where paper_id in (select id from public.papers where subject_id = p_subject_id);
  delete from public.papers          where subject_id = p_subject_id;
  delete from public.exam_cycles     where subject_id = p_subject_id;
  delete from public.questions       where subject_id = p_subject_id;
  delete from public.teacher_subjects where subject_id = p_subject_id;
  -- Only subject-specific formats. subject_id IS NULL means a shared/global
  -- format used by other subjects — never touch those.
  delete from public.paper_formats   where subject_id = p_subject_id;
  delete from public.subjects        where id = p_subject_id;

  perform set_config('teacherease.bulk_delete', 'off', true);

  perform public.log_audit(
    'subject.delete', 'subject', p_subject_id,
    format('DELETED subject %s — %s (%s questions, %s papers, %s cycles)',
           v_code, v_name,
           v_counts->>'questions', v_counts->>'papers', v_counts->>'cycles'),
    v_counts || jsonb_build_object('confirmed_with', p_confirm_code));

  return v_counts;
end $$;

-- ------------------------------------------------------------
-- 7. Admin visibility over every generated paper
--    Additive policies — existing teacher policies keep working.
-- ------------------------------------------------------------
drop policy if exists papers_admin_select on public.papers;
create policy papers_admin_select on public.papers
  for select using (public.is_admin());

drop policy if exists paper_questions_admin_select on public.paper_questions;
create policy paper_questions_admin_select on public.paper_questions
  for select using (public.is_admin());

drop policy if exists exam_cycles_admin_select on public.exam_cycles;
create policy exam_cycles_admin_select on public.exam_cycles
  for select using (public.is_admin());

-- Track who generated each paper (older rows stay null).
alter table public.papers
  add column if not exists created_by uuid default auth.uid();

-- ------------------------------------------------------------
-- 8. Grants — RPCs are callable by logged-in users; the role check
--    inside each function is what actually gates them.
-- ------------------------------------------------------------
grant execute on function public.is_admin()                        to authenticated;
grant execute on function public.subject_delete_preview(uuid)      to authenticated;
grant execute on function public.delete_subject(uuid, text)        to authenticated;
revoke execute on function public.log_audit(text, text, uuid, text, jsonb) from authenticated, anon;

commit;

-- quick check
select action, count(*), max(at) as latest
from public.audit_logs group by action order by latest desc;

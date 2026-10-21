-- ============================================================
-- Migration: Additive College / Autonomous University OBE Extension
-- 
-- Safe and additive:
--   - Does NOT drop or alter any existing columns
--   - Defaults ensure all existing school users and papers continue
--     working without change
--   - Enables Bloom's Taxonomy (BTL 1-6), Course Outcomes (CO1-CO6),
--     Course codes, Semesters, Exam cycles, and Paper formats.
-- ============================================================

begin;

-- 1. Organization / School type
alter table if exists public.schools
  add column if not exists institution_type text not null default 'school'
  check (institution_type in ('school', 'college', 'university'));

-- 2. bank_subjects: course codes, semesters, department
alter table if exists public.bank_subjects
  add column if not exists code text,
  add column if not exists semester int,
  add column if not exists department text;

create index if not exists bank_subjects_code_idx on public.bank_subjects (code);
create index if not exists bank_subjects_sem_idx on public.bank_subjects (semester);

-- 3. bank_units: explicit unit_no
alter table if exists public.bank_units
  add column if not exists unit_no int;

-- 4. question_bank: OBE & accreditation metadata
alter table if exists public.question_bank
  add column if not exists unit_no int,
  add column if not exists co_no int,
  add column if not exists bt_level int,
  add column if not exists difficulty text default 'medium',
  add column if not exists image_url text;

create index if not exists question_bank_unit_idx on public.question_bank (unit_no);
create index if not exists question_bank_bt_idx on public.question_bank (bt_level);
create index if not exists question_bank_co_idx on public.question_bank (co_no);

-- 5. Exam Cycles (e.g., Summer 2026, Regular, Backlog)
create table if not exists public.exam_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  subject_id uuid references public.bank_subjects(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists exam_cycles_subj_idx on public.exam_cycles (subject_id);
create index if not exists exam_cycles_user_idx on public.exam_cycles (user_id);

alter table public.exam_cycles enable row level security;

create policy "exam_cycles_select" on public.exam_cycles
  for select to authenticated
  using (
    user_id = auth.uid()
    or (school_id is not null and public.is_school_member(school_id))
  );

create policy "exam_cycles_insert" on public.exam_cycles
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or (school_id is not null and public.is_school_member(school_id))
  );

create policy "exam_cycles_delete" on public.exam_cycles
  for delete to authenticated
  using (
    user_id = auth.uid()
    or (school_id is not null and public.is_school_admin(school_id))
  );

-- 6. Paper Formats / Blueprint storage
create table if not exists public.paper_formats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  subject_id uuid references public.bank_subjects(id) on delete set null,
  name text not null,
  total_marks int not null default 60,
  blueprint jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists paper_formats_subj_idx on public.paper_formats (subject_id);

alter table public.paper_formats enable row level security;

create policy "paper_formats_select" on public.paper_formats
  for select to authenticated
  using (
    user_id = auth.uid()
    or (school_id is not null and public.is_school_member(school_id))
    or subject_id is null -- global formats readable
  );

create policy "paper_formats_insert" on public.paper_formats
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or (school_id is not null and public.is_school_admin(school_id))
  );

create policy "paper_formats_update" on public.paper_formats
  for update to authenticated
  using (
    user_id = auth.uid()
    or (school_id is not null and public.is_school_admin(school_id))
  );

create policy "paper_formats_delete" on public.paper_formats
  for delete to authenticated
  using (
    user_id = auth.uid()
    or (school_id is not null and public.is_school_admin(school_id))
  );

-- 7. Papers table additions
alter table if exists public.papers
  add column if not exists cycle_id uuid references public.exam_cycles(id) on delete set null,
  add column if not exists variant text not null default 'normal',
  add column if not exists layout_mode text not null default 'standard';

create index if not exists papers_cycle_idx on public.papers (cycle_id);

commit;

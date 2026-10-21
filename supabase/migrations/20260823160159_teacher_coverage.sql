-- What a teacher has actually taught.
--
-- The point of the curriculum layer is that a paper should contain what this
-- teacher has covered, not what her board's syllabus lists for the year. In
-- October she is eight topics in and the ninth must not appear. Two teachers on
-- the same board with the same textbook are at different points in the year.
--
-- Chapter names were only ever a proxy for this. These two tables are the real
-- thing, and they are what make "everything I have taught" a one-tap paper.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------ her classes

-- One row per class she teaches: "Class 3 A, Maths, CBSE". Coverage hangs off
-- this rather than off the teacher, because the same teacher can take Class 3
-- and Class 5 and they are nowhere near the same point in the syllabus.
create table if not exists public.teacher_classes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  label      text not null,               -- "Class 3 A"
  board      text not null,               -- cbse | maharashtra
  class      int  not null check (class between 1 and 8),
  subject    text not null default 'maths',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teacher_classes_user_idx
  on public.teacher_classes (user_id, created_at desc);

-- ----------------------------------------------------------- her coverage

-- Skill ids are the graph's own strings (MTH-style, e.g. "MUL.2D1D.REG") and
-- deliberately not a foreign key: the graph lives in the repo, not the
-- database, so it can be reviewed in a pull request and shipped with a deploy.
-- A skill retired from the graph leaves a harmless orphan row here.
create table if not exists public.teacher_coverage (
  class_id   uuid not null references public.teacher_classes(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  skill_id   text not null,
  covered_on date not null default current_date,
  -- How it got ticked: by hand, from a mapped textbook, or inferred from a
  -- paper she built. Useful later for judging how much to trust it.
  source     text not null default 'checklist',
  primary key (class_id, skill_id)
);

create index if not exists teacher_coverage_user_idx
  on public.teacher_coverage (user_id, class_id);

-- ------------------------------------------------------------------- RLS

alter table public.teacher_classes  enable row level security;
alter table public.teacher_coverage enable row level security;

drop policy if exists "teacher_classes_all_own" on public.teacher_classes;
create policy "teacher_classes_all_own" on public.teacher_classes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "teacher_coverage_all_own" on public.teacher_coverage;
create policy "teacher_coverage_all_own" on public.teacher_coverage
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

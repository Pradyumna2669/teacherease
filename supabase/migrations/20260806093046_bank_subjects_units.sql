-- Question bank v2: subjects -> units -> questions.
--
-- Teachers now set up their syllabus up front (a subject per class, units inside
-- it) and file questions under a unit with a marks value. Papers are then built
-- by asking for "N marks from this unit" instead of hand-picking every question.
--
-- Adds:
--   bank_subjects / bank_units  — the syllabus tree
--   question_bank.*             — unit link, marks, enabled flag, AI provenance,
--                                 and usage counters that drive fair rotation
--   bump_bank_usage()           — atomic usage increment after a paper is built
--
-- Legacy rows keep working: subject_id/unit_id stay null and surface as
-- "Unfiled" in the UI until the teacher files them.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- subjects

create table if not exists public.bank_subjects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  class_name text,
  created_at timestamptz not null default now()
);

-- One subject per (teacher, name, class). Case-insensitive so "Maths" and
-- "maths" don't both get created.
create unique index if not exists bank_subjects_unique
  on public.bank_subjects (user_id, lower(name), coalesce(lower(class_name), ''));

create index if not exists bank_subjects_user_idx
  on public.bank_subjects (user_id, name);

-- ------------------------------------------------------------------- units

create table if not exists public.bank_units (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.bank_subjects(id) on delete cascade,
  name       text not null,
  book_name  text,                      -- textbook this unit comes from
  position   integer not null default 0, -- teacher-defined ordering
  created_at timestamptz not null default now()
);

create unique index if not exists bank_units_unique
  on public.bank_units (subject_id, lower(name));

create index if not exists bank_units_subject_idx
  on public.bank_units (user_id, subject_id, position);

-- ------------------------------------------------- question_bank additions

alter table public.question_bank
  add column if not exists subject_id   uuid references public.bank_subjects(id) on delete set null,
  add column if not exists unit_id      uuid references public.bank_units(id) on delete set null,
  -- Marks this question is worth. Selection targets a marks total, so this is
  -- the key field for "give me 20 marks from Unit 3".
  add column if not exists marks        integer not null default 1,
  -- Teachers disable a question instead of deleting when it's wrong for this
  -- term but worth keeping. Disabled questions are never auto-selected.
  add column if not exists enabled      boolean not null default true,
  -- 'manual' | 'paper' (saved from a built paper) | 'ai' (generated)
  add column if not exists source       text not null default 'manual',
  -- Fair-rotation counters. A question that has never been used wins over one
  -- used three times, so repeated papers on the same unit stay fresh.
  add column if not exists times_used   integer not null default 0,
  add column if not exists last_used_at timestamptz;

-- The hot path: pick enabled questions for a unit, cheapest-used first.
create index if not exists question_bank_unit_pick_idx
  on public.question_bank (user_id, unit_id, enabled, times_used, last_used_at);

create index if not exists question_bank_subject_idx
  on public.question_bank (user_id, subject_id);

-- ---------------------------------------------------------------- usage rpc

-- Bump usage for the questions that just went into a paper. Scoped to auth.uid()
-- inside the function, so passing ids from another account is a no-op — the
-- caller only ever touches their own rows.
create or replace function public.bump_bank_usage(p_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.question_bank
     set times_used   = times_used + 1,
         last_used_at = now()
   where user_id = auth.uid()
     and id = any(p_ids);
$$;

revoke all on function public.bump_bank_usage(uuid[]) from public;
grant execute on function public.bump_bank_usage(uuid[]) to authenticated, service_role;

-- --------------------------------------------------------------------- RLS

alter table public.bank_subjects enable row level security;
alter table public.bank_units    enable row level security;

drop policy if exists "bank_subjects_all_own" on public.bank_subjects;
create policy "bank_subjects_all_own" on public.bank_subjects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "bank_units_all_own" on public.bank_units;
create policy "bank_units_all_own" on public.bank_units
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

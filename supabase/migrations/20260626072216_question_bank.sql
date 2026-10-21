-- Personal question bank. Teachers save questions (tagged by subject/class/type)
-- and reuse them in future papers. The full Question object is stored as JSONB
-- in `payload`; the flat columns exist for fast search/filter.
--
-- Client-managed like `papers`: RLS lets a teacher CRUD only their own rows.

create extension if not exists pgcrypto;

create table if not exists public.question_bank (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null default '',   -- question label, for search
  type       text not null,              -- question type
  subject    text,
  class_name text,
  topic      text,                        -- optional tag (future: AI auto-fill)
  payload    jsonb not null,              -- the full Question object, ready to reuse
  created_at timestamptz not null default now()
);

create index if not exists question_bank_user_idx
  on public.question_bank (user_id, created_at desc);

-- Helps filtered browsing by subject/class.
create index if not exists question_bank_user_subject_idx
  on public.question_bank (user_id, subject, class_name);

alter table public.question_bank enable row level security;

drop policy if exists "qbank_select_own" on public.question_bank;
create policy "qbank_select_own" on public.question_bank
  for select using (auth.uid() = user_id);

drop policy if exists "qbank_insert_own" on public.question_bank;
create policy "qbank_insert_own" on public.question_bank
  for insert with check (auth.uid() = user_id);

drop policy if exists "qbank_update_own" on public.question_bank;
create policy "qbank_update_own" on public.question_bank
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "qbank_delete_own" on public.question_bank;
create policy "qbank_delete_own" on public.question_bank
  for delete using (auth.uid() = user_id);

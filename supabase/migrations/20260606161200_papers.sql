-- PaperGen schema: one row per saved paper, owned by an authenticated teacher.
-- Apply via Supabase SQL editor, `supabase db push`, or the project MCP's apply_migration.

create extension if not exists pgcrypto;

create table if not exists public.papers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'Untitled Paper',
  subject     text,
  class_name  text,
  settings    jsonb not null default '{}'::jsonb,
  questions   jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists papers_user_id_updated_idx
  on public.papers (user_id, updated_at desc);

-- Keep updated_at fresh on every write (auto-save relies on it for ordering).
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists papers_set_updated_at on public.papers;
create trigger papers_set_updated_at
  before update on public.papers
  for each row execute function public.set_updated_at();

-- Row-Level Security: a teacher can only see and touch their own papers.
alter table public.papers enable row level security;

drop policy if exists "papers_select_own" on public.papers;
create policy "papers_select_own" on public.papers
  for select using (auth.uid() = user_id);

drop policy if exists "papers_insert_own" on public.papers;
create policy "papers_insert_own" on public.papers
  for insert with check (auth.uid() = user_id);

drop policy if exists "papers_update_own" on public.papers;
create policy "papers_update_own" on public.papers
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "papers_delete_own" on public.papers;
create policy "papers_delete_own" on public.papers
  for delete using (auth.uid() = user_id);

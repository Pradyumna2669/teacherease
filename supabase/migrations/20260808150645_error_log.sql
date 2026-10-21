-- Server-side error log.
--
-- A user hit "Request Entity Too Large" scanning 3 pages and we only found out
-- because they said so. Failures in the paid paths (scan, AI question
-- generation) now land here so the admin dashboard can surface them.
--
-- Deliberately NOT storing request bodies: those contain photographs of exam
-- papers. Only the shape of the failure is kept.

create table if not exists public.error_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  -- "scan" | "generate_questions" | ...
  action      text not null,
  -- HTTP status we returned (or 0 for an uncaught throw).
  status      int  not null default 0,
  message     text not null,
  -- Non-sensitive shape info: page count, payload size, model, provider.
  context     jsonb not null default '{}'::jsonb,
  -- Whether the teacher was charged despite the failure. Should always be
  -- false; if it is ever true we owe someone a refund.
  charged     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists error_log_created_idx on public.error_log (created_at desc);
create index if not exists error_log_action_idx  on public.error_log (action, created_at desc);

alter table public.error_log enable row level security;

-- No client-side access at all. Writes happen with the service-role key from
-- route handlers; reads happen through the admin view, which already gates on
-- the owner allowlist.
revoke all on public.error_log from anon, authenticated;

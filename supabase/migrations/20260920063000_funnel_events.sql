-- Private product funnel events. Store only event names and non-sensitive metadata.
-- All writes go through the server service role; browser clients cannot query this table.
create table if not exists public.funnel_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists funnel_events_created_idx
  on public.funnel_events (created_at desc);
create index if not exists funnel_events_event_created_idx
  on public.funnel_events (event, created_at desc);
create index if not exists funnel_events_user_created_idx
  on public.funnel_events (user_id, created_at desc);

alter table public.funnel_events enable row level security;
revoke all on public.funnel_events from anon, authenticated;

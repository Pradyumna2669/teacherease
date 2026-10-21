-- PaperGen subscriptions: one row per teacher, mirrored from Razorpay webhooks.
-- The webhook handler writes here with the service-role key (bypasses RLS).
-- Teachers can read their own row to know their plan/status.

create table if not exists public.subscriptions (
  user_id                  uuid primary key references auth.users(id) on delete cascade,
  plan                     text not null default 'free',      -- free | teacher_monthly | teacher_annual | school
  status                   text not null default 'inactive',  -- inactive | active | halted | cancelled | pending
  razorpay_customer_id     text,
  razorpay_subscription_id text,
  current_period_end       timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- Fast lookup by Razorpay subscription id (webhook payloads reference it).
create unique index if not exists subscriptions_rzp_sub_idx
  on public.subscriptions (razorpay_subscription_id)
  where razorpay_subscription_id is not null;

-- Track per-period usage for the free tier's monthly paper limit.
-- (Kept simple: a counter the app increments; period rolls over by month key.)
create table if not exists public.usage_counters (
  user_id     uuid not null references auth.users(id) on delete cascade,
  period      text not null,            -- e.g. '2026-06' (UTC month)
  papers_made integer not null default 0,
  scans_made  integer not null default 0,
  primary key (user_id, period)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- RLS: a teacher can read their own subscription + usage; no client writes
-- (all mutations happen server-side via the service role, which bypasses RLS).
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;

drop policy if exists "subs_select_own" on public.subscriptions;
create policy "subs_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "usage_select_own" on public.usage_counters;
create policy "usage_select_own" on public.usage_counters
  for select using (auth.uid() = user_id);

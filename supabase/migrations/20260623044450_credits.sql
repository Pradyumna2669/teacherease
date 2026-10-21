-- PaperGen credits system. Replaces the "unlimited" subscription model: every
-- billable action (scan, generate) spends credits. This kills account-sharing
-- abuse because shared logins just drain credits faster.
--
-- Wallet resolution: if a user belongs to a school, billable actions draw from
-- that school's shared pool; otherwise from the user's personal balance. All
-- mutations go through SECURITY DEFINER RPCs that row-lock the wallet, so
-- concurrent requests can't double-spend.
--
-- Apply via Supabase SQL editor, `supabase db push`, or the MCP's apply_migration.

create extension if not exists pgcrypto;

-- Personal credit wallet — one row per teacher (auto-seeded on signup below).
create table if not exists public.credit_balances (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  balance    integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- Schools hold a shared credit pool that their teachers draw from. Admins buy
-- credits in bulk at a discount (discount_bps = discount in basis points, e.g.
-- 1500 = 15% off the per-credit list price; applied at purchase, display only).
create table if not exists public.schools (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  credits_balance integer not null default 0 check (credits_balance >= 0),
  discount_bps integer not null default 0 check (discount_bps between 0 and 10000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.school_members (
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'teacher',  -- admin | teacher
  added_at  timestamptz not null default now(),
  primary key (school_id, user_id)
);

-- A teacher belongs to at most one school's pool (enforce single membership).
create unique index if not exists school_members_user_unique
  on public.school_members (user_id);

-- Append-only audit log of every credit movement (spend negative, grant positive).
create table if not exists public.credit_ledger (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,  -- actor
  school_id     uuid references public.schools(id) on delete set null,  -- set when pool-funded
  delta         integer not null,             -- negative = spend, positive = grant
  reason        text not null,                -- scan | generate | topup | monthly_refill | refund | signup_bonus | admin_adjust
  balance_after integer not null,
  ref           text,                         -- e.g. paper id, razorpay payment id
  created_at    timestamptz not null default now()
);

create index if not exists credit_ledger_user_idx
  on public.credit_ledger (user_id, created_at desc);

-- Shared updated_at trigger fn (idempotent; also defined in earlier migrations).
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists credit_balances_set_updated_at on public.credit_balances;
create trigger credit_balances_set_updated_at
  before update on public.credit_balances
  for each row execute function public.set_updated_at();

drop trigger if exists schools_set_updated_at on public.schools;
create trigger schools_set_updated_at
  before update on public.schools
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Atomic spend. Resolves the caller's wallet (school pool if a member, else
-- personal), row-locks it, and deducts p_cost iff the balance covers it.
-- Returns ok=false (without mutating) when funds are short. Caller passes the
-- cost so pricing stays in app config (lib/credits.ts).
-- ---------------------------------------------------------------------------
create or replace function public.spend_credits(
  p_user_id uuid,
  p_reason  text,
  p_cost    integer,
  p_ref     text default null
) returns table (ok boolean, balance_after integer, wallet text)
language plpgsql security definer set search_path = public as $$
declare
  v_school_id uuid;
  v_balance   integer;
begin
  if p_cost is null or p_cost < 0 then
    raise exception 'spend_credits: cost must be >= 0 (got %)', p_cost;
  end if;

  select sm.school_id into v_school_id
  from public.school_members sm
  where sm.user_id = p_user_id
  limit 1;

  if v_school_id is not null then
    -- School pool path.
    select s.credits_balance into v_balance
    from public.schools s where s.id = v_school_id
    for update;

    if v_balance < p_cost then
      return query select false, v_balance, 'school'::text;
      return;
    end if;

    update public.schools
      set credits_balance = credits_balance - p_cost
      where id = v_school_id;
    v_balance := v_balance - p_cost;

    insert into public.credit_ledger (user_id, school_id, delta, reason, balance_after, ref)
      values (p_user_id, v_school_id, -p_cost, p_reason, v_balance, p_ref);

    return query select true, v_balance, 'school'::text;
  else
    -- Personal path. Ensure a row exists, then lock it.
    insert into public.credit_balances (user_id)
      values (p_user_id)
      on conflict (user_id) do nothing;

    select b.balance into v_balance
    from public.credit_balances b where b.user_id = p_user_id
    for update;

    if v_balance < p_cost then
      return query select false, v_balance, 'personal'::text;
      return;
    end if;

    update public.credit_balances
      set balance = balance - p_cost
      where user_id = p_user_id;
    v_balance := v_balance - p_cost;

    insert into public.credit_ledger (user_id, school_id, delta, reason, balance_after, ref)
      values (p_user_id, null, -p_cost, p_reason, v_balance, p_ref);

    return query select true, v_balance, 'personal'::text;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Wallet-aware grant: adds credits to whichever wallet the user spends from.
-- Used for refunds (failed generations) and monthly subscription refills.
-- ---------------------------------------------------------------------------
create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount  integer,
  p_reason  text,
  p_ref     text default null
) returns table (balance_after integer, wallet text)
language plpgsql security definer set search_path = public as $$
declare
  v_school_id uuid;
  v_balance   integer;
begin
  if p_amount is null or p_amount < 0 then
    raise exception 'grant_credits: amount must be >= 0 (got %)', p_amount;
  end if;

  select sm.school_id into v_school_id
  from public.school_members sm
  where sm.user_id = p_user_id
  limit 1;

  if v_school_id is not null then
    update public.schools
      set credits_balance = credits_balance + p_amount
      where id = v_school_id
      returning credits_balance into v_balance;

    insert into public.credit_ledger (user_id, school_id, delta, reason, balance_after, ref)
      values (p_user_id, v_school_id, p_amount, p_reason, v_balance, p_ref);

    return query select v_balance, 'school'::text;
  else
    insert into public.credit_balances (user_id, balance)
      values (p_user_id, p_amount)
      on conflict (user_id) do update set balance = public.credit_balances.balance + p_amount
      returning balance into v_balance;

    insert into public.credit_ledger (user_id, school_id, delta, reason, balance_after, ref)
      values (p_user_id, null, p_amount, p_reason, v_balance, p_ref);

    return query select v_balance, 'personal'::text;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Top up a school pool directly (admin bulk purchase). Bypasses wallet
-- resolution since the buyer is the school, not an individual teacher.
-- ---------------------------------------------------------------------------
create or replace function public.add_school_credits(
  p_school_id uuid,
  p_amount    integer,
  p_reason    text default 'topup',
  p_ref       text default null
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_balance integer;
  v_admin   uuid;
begin
  if p_amount is null or p_amount < 0 then
    raise exception 'add_school_credits: amount must be >= 0 (got %)', p_amount;
  end if;

  update public.schools
    set credits_balance = credits_balance + p_amount
    where id = p_school_id
    returning credits_balance, admin_user_id into v_balance, v_admin;

  if v_balance is null then
    raise exception 'add_school_credits: school % not found', p_school_id;
  end if;

  insert into public.credit_ledger (user_id, school_id, delta, reason, balance_after, ref)
    values (v_admin, p_school_id, p_amount, p_reason, v_balance, p_ref);

  return v_balance;
end;
$$;

-- ---------------------------------------------------------------------------
-- Look up a user id by email (for school admins adding teachers by email).
-- SECURITY DEFINER so it can read auth.users; only ever called server-side.
-- ---------------------------------------------------------------------------
create or replace function public.user_id_by_email(p_email text)
returns uuid language sql security definer set search_path = public as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

-- ---------------------------------------------------------------------------
-- School roster with each member's email + credits spent from the pool.
-- SECURITY DEFINER (reads auth.users); the route restricts this to the admin.
-- ---------------------------------------------------------------------------
create or replace function public.school_members_detail(p_school_id uuid)
returns table(user_id uuid, email text, role text, spent integer)
language sql security definer set search_path = public as $$
  select m.user_id, u.email::text, m.role,
    coalesce(-sum(l.delta) filter (where l.delta < 0), 0)::integer as spent
  from public.school_members m
  join auth.users u on u.id = m.user_id
  left join public.credit_ledger l
    on l.user_id = m.user_id and l.school_id = p_school_id
  where m.school_id = p_school_id
  group by m.user_id, u.email, m.role
  order by m.role, u.email;
$$;

-- ---------------------------------------------------------------------------
-- Seed new signups with a free trial balance so teachers can try before paying.
-- ---------------------------------------------------------------------------
create or replace function public.grant_signup_bonus()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.credit_balances (user_id, balance)
    values (new.id, 50)
    on conflict (user_id) do nothing;

  insert into public.credit_ledger (user_id, delta, reason, balance_after, ref)
    values (new.id, 50, 'signup_bonus', 50, null);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_grant_credits on auth.users;
create trigger on_auth_user_created_grant_credits
  after insert on auth.users
  for each row execute function public.grant_signup_bonus();

-- ---------------------------------------------------------------------------
-- RLS: teachers read their own wallet, ledger, and school context. ALL writes
-- happen via the SECURITY DEFINER RPCs above (service role), never direct.
-- ---------------------------------------------------------------------------
alter table public.credit_balances enable row level security;
alter table public.credit_ledger   enable row level security;
alter table public.schools         enable row level security;
alter table public.school_members  enable row level security;

drop policy if exists "credit_balances_select_own" on public.credit_balances;
create policy "credit_balances_select_own" on public.credit_balances
  for select using (auth.uid() = user_id);

drop policy if exists "credit_ledger_select_own" on public.credit_ledger;
create policy "credit_ledger_select_own" on public.credit_ledger
  for select using (auth.uid() = user_id);

-- A teacher sees their own membership row; a school admin sees all members.
drop policy if exists "school_members_select" on public.school_members;
create policy "school_members_select" on public.school_members
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.schools s
      where s.id = school_members.school_id and s.admin_user_id = auth.uid()
    )
  );

-- Members and the admin can read the school row (to show pool balance).
drop policy if exists "schools_select_member_or_admin" on public.schools;
create policy "schools_select_member_or_admin" on public.schools
  for select using (
    auth.uid() = admin_user_id
    or exists (
      select 1 from public.school_members sm
      where sm.school_id = schools.id and sm.user_id = auth.uid()
    )
  );

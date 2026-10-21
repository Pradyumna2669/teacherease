-- Paid credit grants were idempotent only by convention: the webhook did a
-- SELECT on credit_ledger.ref and then, in a second round-trip, granted. Razorpay
-- retries webhooks and the retries arrive concurrently — both copies read "not
-- granted yet" and both granted. Nothing in the database said no.
--
-- This puts the guard behind a unique index and moves it INSIDE the grant RPCs,
-- so the ledger INSERT is itself the idempotency check: a duplicate rolls back
-- to a no-op instead of double-crediting (and instead of erroring, which would
-- only make Razorpay retry harder).

-- Refs are namespaced per payment rail from now on ('rzp:pay_xxx') so a second
-- rail's ids can never collide with Razorpay's. Existing paid-grant rows move to
-- the same scheme, otherwise a retry landing after this deploy would look like a
-- brand-new ref and credit a second time. Re-running is a no-op: rewritten refs
-- no longer match these prefixes.
update public.credit_ledger
  set ref = 'rzp:' || ref
  where ref is not null
    and reason in ('topup', 'monthly_refill')
    and (ref like 'pay\_%' or ref like 'order\_%' or ref like 'sub\_%');

-- Duplicates already granted by the old check-then-act would block the index
-- below. The ledger is the audit trail, so keep every row and only detach the
-- later copies from the ref — whether that money is owed back is a decision for
-- a human, not something a migration should guess at.
with dupe as (
  select id, row_number() over (partition by ref order by created_at, id) as rn
  from public.credit_ledger
  where ref is not null and reason in ('topup', 'monthly_refill')
)
update public.credit_ledger l
  set ref = l.ref || ':dup' || d.rn
  from dupe d
  where d.id = l.id and d.rn > 1;

-- Partial: only paid grants are ref-unique. Spends and refunds reference a paper
-- id, which legitimately repeats (a paper can be generated more than once).
create unique index if not exists credit_ledger_ref_grant_idx
  on public.credit_ledger (ref)
  where ref is not null and reason in ('topup', 'monthly_refill');

-- ---------------------------------------------------------------------------
-- grant_credits: unchanged wallet behaviour, but the ledger insert now decides
-- whether the grant happens at all.
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

  -- This block is a sub-transaction: if credit_ledger_ref_grant_idx rejects the
  -- ledger row, the balance bump above it rolls back with it. A concurrent
  -- retry blocks on the index until the first grant commits, then lands here.
  begin
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
  exception when unique_violation then
    -- Already granted for this ref. Report the balance the wallet actually has
    -- so a replayed webhook still sees a success and stops retrying.
    if v_school_id is not null then
      select s.credits_balance into v_balance
      from public.schools s where s.id = v_school_id;
      return query select coalesce(v_balance, 0), 'school'::text;
    else
      select b.balance into v_balance
      from public.credit_balances b where b.user_id = p_user_id;
      return query select coalesce(v_balance, 0), 'personal'::text;
    end if;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- add_school_credits: same treatment. School bulk top-ups arrive on the same
-- retried order.paid webhook, and they share the ledger's 'topup' reason.
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

  begin
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
  exception when unique_violation then
    select s.credits_balance into v_balance
    from public.schools s where s.id = p_school_id;
    return coalesce(v_balance, 0);
  end;
end;
$$;

-- CREATE OR REPLACE keeps the existing ACL, but re-assert it so these two can
-- never drift back to being callable by a signed-in user (see 0004 / 0005).
revoke execute on function public.grant_credits(uuid, integer, text, text) from public, anon, authenticated;
revoke execute on function public.add_school_credits(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.grant_credits(uuid, integer, text, text) to service_role;
grant execute on function public.add_school_credits(uuid, integer, text, text) to service_role;

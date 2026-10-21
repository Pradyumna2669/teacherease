-- Bump the signup bonus from 50 → 60 credits. With per-page scan pricing
-- (15 credits/page), 60 credits = exactly one free 4-page scan, so a new teacher
-- can try the hero feature before paying. Better trial-to-paid conversion.
create or replace function public.grant_signup_bonus()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.credit_balances (user_id, balance)
    values (new.id, 60)
    on conflict (user_id) do nothing;

  insert into public.credit_ledger (user_id, delta, reason, balance_after, ref)
    values (new.id, 60, 'signup_bonus', 60, null);
  return new;
end;
$$;

revoke execute on function public.grant_signup_bonus() from public, anon, authenticated;

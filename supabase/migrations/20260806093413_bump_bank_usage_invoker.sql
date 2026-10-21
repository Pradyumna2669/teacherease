-- Harden bump_bank_usage.
--
-- Supabase's default privileges grant EXECUTE on new public functions directly
-- to anon, so the "revoke from public" in 0008 did not cover it. The function
-- was harmless to anon either way (auth.uid() is null, so the WHERE matches no
-- rows), but there is no reason for it to be reachable at all.
--
-- Also switch to SECURITY INVOKER: question_bank already has an RLS update
-- policy scoped to auth.uid(), so the function does not need definer rights.
-- The explicit user_id filter stays as a second line of defence.

create or replace function public.bump_bank_usage(p_ids uuid[])
returns void
language sql
security invoker
set search_path = public
as $$
  update public.question_bank
     set times_used   = times_used + 1,
         last_used_at = now()
   where user_id = auth.uid()
     and id = any(p_ids);
$$;

revoke all on function public.bump_bank_usage(uuid[]) from public, anon;
grant execute on function public.bump_bank_usage(uuid[]) to authenticated, service_role;

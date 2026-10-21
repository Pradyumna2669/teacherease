-- Supabase grants EXECUTE on new public functions directly to the `anon` and
-- `authenticated` roles, so the PUBLIC revoke in 0004 did NOT remove their
-- access (verified: they could still call /rest/v1/rpc/grant_credits and mint
-- credits). Revoke from the roles explicitly. service_role keeps its grant so
-- the server-side admin client can still call these.
revoke execute on function public.spend_credits(uuid, text, integer, text) from anon, authenticated;
revoke execute on function public.grant_credits(uuid, integer, text, text) from anon, authenticated;
revoke execute on function public.add_school_credits(uuid, integer, text, text) from anon, authenticated;
revoke execute on function public.user_id_by_email(text) from anon, authenticated;
revoke execute on function public.school_members_detail(uuid) from anon, authenticated;
revoke execute on function public.grant_signup_bonus() from anon, authenticated;

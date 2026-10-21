-- Lock down the credit RPCs. They are SECURITY DEFINER and must ONLY be called
-- by the server via the service-role key. By default Postgres grants EXECUTE to
-- PUBLIC, which PostgREST exposes to the `anon` and `authenticated` roles — so
-- a signed-in user could POST /rest/v1/rpc/grant_credits and mint themselves
-- free credits. Revoke from PUBLIC, then re-grant only to service_role.

revoke execute on function public.spend_credits(uuid, text, integer, text) from public;
revoke execute on function public.grant_credits(uuid, integer, text, text) from public;
revoke execute on function public.add_school_credits(uuid, integer, text, text) from public;
revoke execute on function public.user_id_by_email(text) from public;
revoke execute on function public.school_members_detail(uuid) from public;
revoke execute on function public.grant_signup_bonus() from public;

grant execute on function public.spend_credits(uuid, text, integer, text) to service_role;
grant execute on function public.grant_credits(uuid, integer, text, text) to service_role;
grant execute on function public.add_school_credits(uuid, integer, text, text) to service_role;
grant execute on function public.user_id_by_email(text) to service_role;
grant execute on function public.school_members_detail(uuid) to service_role;

-- Pin the shared trigger fn's search_path (linter: function_search_path_mutable).
alter function public.set_updated_at() set search_path = public;

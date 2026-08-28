REVOKE ALL ON FUNCTION public.tg_enforce_listing_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.plan_id_for_user(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_plan_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_plan_usage() TO authenticated;
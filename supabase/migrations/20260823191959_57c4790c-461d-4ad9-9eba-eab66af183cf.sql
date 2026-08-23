REVOKE ALL ON FUNCTION public.tg_property_favorite_alerts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_saved_search_alerts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.saved_search_matches(jsonb, public.properties) FROM PUBLIC, anon, authenticated;
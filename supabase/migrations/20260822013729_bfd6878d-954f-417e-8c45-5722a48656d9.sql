-- Minimal agent directory lookup so owners can assign agents to a listing.
-- Returns only non-sensitive public business fields (no email/phone/national id).
CREATE OR REPLACE FUNCTION public.search_agents(_q text)
RETURNS TABLE(id uuid, full_name text, agency_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.agency_name, p.avatar_url
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND length(coalesce(_q, '')) >= 3
    AND public.has_role(p.id, 'agent')
    AND (
      p.email ILIKE _q
      OR p.full_name ILIKE '%' || _q || '%'
      OR p.agency_name ILIKE '%' || _q || '%'
    )
  LIMIT 10;
$$;

REVOKE ALL ON FUNCTION public.search_agents(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_agents(text) TO authenticated;
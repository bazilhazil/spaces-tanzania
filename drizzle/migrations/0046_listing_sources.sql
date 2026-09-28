CREATE OR REPLACE FUNCTION public.listing_sources(_ids uuid[])
RETURNS TABLE(property_id uuid, source text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id,
    CASE
      WHEN EXISTS (SELECT 1 FROM agencies a WHERE a.admin_id = p.owner_id)
        OR EXISTS (SELECT 1 FROM agency_members m WHERE m.user_id = p.owner_id AND m.status = 'active') THEN 'agency'
      WHEN EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = p.owner_id AND r.role = 'agent') THEN 'dalali'
      ELSE 'owner'
    END
  FROM properties p
  WHERE p.id = ANY(_ids) AND p.status = 'live'
  LIMIT 500;
$$;
REVOKE ALL ON FUNCTION public.listing_sources(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.listing_sources(uuid[]) TO anon, authenticated;
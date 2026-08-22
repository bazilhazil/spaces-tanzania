-- 1) Property contact details: replace blanket authenticated read with interest-scoped read
DROP POLICY IF EXISTS "Authenticated can read contacts of live listings" ON public.property_contacts;

CREATE POLICY "Engaged users read contacts of live listings"
ON public.property_contacts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_contacts.property_id
      AND p.status = 'live'::property_status
  )
  AND (
    EXISTS (SELECT 1 FROM public.leads l
            WHERE l.property_id = property_contacts.property_id AND l.visitor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.bookings b
            WHERE b.property_id = property_contacts.property_id AND b.buyer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.conversations c
            WHERE c.property_id = property_contacts.property_id AND c.buyer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.deals d
            WHERE d.property_id = property_contacts.property_id AND d.buyer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.favorites f
            WHERE f.property_id = property_contacts.property_id AND f.user_id = auth.uid())
  )
);

CREATE POLICY "Assigned agents read property contacts"
ON public.property_contacts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.property_agents pa
    WHERE pa.property_id = property_contacts.property_id
      AND pa.agent_id = auth.uid()
  )
);

-- 2) Move the elevated agent-search helper out of the exposed API schema
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
GRANT USAGE ON SCHEMA private TO authenticated;

DROP FUNCTION IF EXISTS public.search_agents(text);

CREATE OR REPLACE FUNCTION private.search_agents(_q text)
RETURNS TABLE(id uuid, full_name text, agency_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name, p.agency_name, p.avatar_url
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND length(coalesce(_q, '')) BETWEEN 3 AND 120
    AND (
      EXISTS (SELECT 1 FROM public.properties pr WHERE pr.owner_id = auth.uid())
      OR public.has_role(auth.uid(), 'admin')
    )
    AND public.has_role(p.id, 'agent')
    AND (
      p.email ILIKE _q
      OR p.full_name ILIKE '%' || _q || '%'
      OR p.agency_name ILIKE '%' || _q || '%'
    )
  LIMIT 10;
$$;

REVOKE ALL ON FUNCTION private.search_agents(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.search_agents(text) FROM anon;
GRANT EXECUTE ON FUNCTION private.search_agents(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.search_agents(_q text)
RETURNS TABLE(id uuid, full_name text, agency_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT s.id, s.full_name, s.agency_name, s.avatar_url
  FROM private.search_agents(_q) s;
$$;

REVOKE ALL ON FUNCTION public.search_agents(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_agents(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_agents(text) TO authenticated;
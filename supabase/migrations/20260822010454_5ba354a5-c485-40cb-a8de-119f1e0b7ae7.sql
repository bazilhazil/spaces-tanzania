-- 1) Allow signed-in users to read contact details for live listings under RLS
CREATE POLICY "Authenticated can read contacts of live listings"
ON public.property_contacts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_contacts.property_id
      AND p.status = 'live'
  )
);

-- 2) Switch the helper away from SECURITY DEFINER so RLS applies to the caller
CREATE OR REPLACE FUNCTION public.get_property_contact(_property_id uuid)
RETURNS TABLE(contact_name text, contact_phone text, contact_whatsapp text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT c.contact_name, c.contact_phone, c.contact_whatsapp
  FROM public.property_contacts c
  WHERE c.property_id = _property_id
    AND auth.uid() IS NOT NULL;
$function$;

REVOKE ALL ON FUNCTION public.get_property_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_property_contact(uuid) TO authenticated, service_role;

-- 3) Constrain anonymous analytics writes
ALTER TABLE public.property_views
  ADD CONSTRAINT property_views_session_id_len
  CHECK (session_id IS NULL OR char_length(session_id) <= 100);

DROP POLICY IF EXISTS "log view for self or anon" ON public.property_views;

CREATE POLICY "log view for self or anon"
ON public.property_views
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (viewer_id IS NULL OR viewer_id = auth.uid())
  AND (session_id IS NULL OR char_length(session_id) <= 100)
  AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_views.property_id
      AND p.status = 'live'
  )
);
CREATE TABLE public.property_contacts (
  property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
  contact_name text,
  contact_phone text,
  contact_whatsapp text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_contacts TO authenticated;
GRANT ALL ON public.property_contacts TO service_role;

ALTER TABLE public.property_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and admins read property contacts"
ON public.property_contacts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid())
       OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners insert property contacts"
ON public.property_contacts FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid()));

CREATE POLICY "Owners update property contacts"
ON public.property_contacts FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid())
       OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid())
       OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners delete property contacts"
ON public.property_contacts FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid())
       OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER property_contacts_set_updated_at
BEFORE UPDATE ON public.property_contacts
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.property_contacts (property_id, contact_name, contact_phone, contact_whatsapp)
SELECT id, contact_name, contact_phone, contact_whatsapp
FROM public.properties
WHERE contact_name IS NOT NULL OR contact_phone IS NOT NULL OR contact_whatsapp IS NOT NULL
ON CONFLICT (property_id) DO NOTHING;

ALTER TABLE public.properties
  DROP COLUMN contact_name,
  DROP COLUMN contact_phone,
  DROP COLUMN contact_whatsapp;

CREATE OR REPLACE FUNCTION public.get_property_contact(_property_id uuid)
RETURNS TABLE (contact_name text, contact_phone text, contact_whatsapp text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.contact_name, c.contact_phone, c.contact_whatsapp
  FROM public.property_contacts c
  JOIN public.properties p ON p.id = c.property_id
  WHERE c.property_id = _property_id
    AND auth.uid() IS NOT NULL
    AND (p.status = 'live' OR p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
$$;

REVOKE ALL ON FUNCTION public.get_property_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_property_contact(uuid) TO authenticated;

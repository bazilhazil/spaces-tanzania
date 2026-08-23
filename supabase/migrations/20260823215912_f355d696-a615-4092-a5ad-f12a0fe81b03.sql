
DROP POLICY IF EXISTS "Anonymous visitors can view live properties" ON public.properties;
CREATE POLICY "Public can view listed properties"
ON public.properties FOR SELECT TO anon
USING (status IN ('live','sold','rented'));

DROP POLICY IF EXISTS "Authenticated can view live or own properties" ON public.properties;
CREATE POLICY "Authenticated can view listed or own properties"
ON public.properties FOR SELECT TO authenticated
USING (status IN ('live','sold','rented') OR auth.uid() = owner_id OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Public can view media of live properties" ON public.property_media;
CREATE POLICY "Public can view media of listed properties"
ON public.property_media FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.properties p
  WHERE p.id = property_media.property_id
    AND (p.status IN ('live','sold','rented') OR p.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
));

CREATE OR REPLACE VIEW public.public_listing_pages
WITH (security_invoker = on) AS
SELECT id, owner_id, property_type, listing_type, title, description, price, currency,
       negotiable, bedrooms, bathrooms, parking, area_sqm, region, district, ward, street,
       address, latitude, longitude, amenities, status, view_count, floor, year_built,
       landmark, verified, featured, created_at, updated_at
FROM public.properties
WHERE status IN ('live','sold','rented');

GRANT SELECT ON public.public_listing_pages TO anon, authenticated;
GRANT ALL ON public.public_listing_pages TO service_role;

DROP VIEW IF EXISTS public.public_properties;
DROP VIEW IF EXISTS public.public_listing_pages;

CREATE VIEW public.public_properties WITH (security_invoker = true) AS
SELECT id, owner_id, property_type, listing_type, title, description, price, currency, negotiable,
  bedrooms, bathrooms, parking, parking_available, area_sqm, region, district, ward, street, address,
  latitude, longitude, amenities, status, view_count, floor, year_built, landmark, verified, featured,
  created_at, updated_at
FROM public.properties
WHERE status = 'live'::property_status;

CREATE VIEW public.public_listing_pages WITH (security_invoker = true) AS
SELECT id, owner_id, property_type, listing_type, title, description, price, currency, negotiable,
  bedrooms, bathrooms, parking, parking_available, area_sqm, region, district, ward, street, address,
  latitude, longitude, amenities, status, view_count, floor, year_built, landmark, verified, featured,
  created_at, updated_at
FROM public.properties
WHERE status = ANY (ARRAY['live'::property_status, 'sold'::property_status, 'rented'::property_status]);

GRANT SELECT ON public.public_properties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_properties TO authenticated;
GRANT ALL ON public.public_properties TO service_role;
GRANT SELECT ON public.public_listing_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_listing_pages TO authenticated;
GRANT ALL ON public.public_listing_pages TO service_role;
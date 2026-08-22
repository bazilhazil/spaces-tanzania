-- Restrict anonymous visitors to non-contact columns only
REVOKE SELECT ON public.properties FROM anon;
GRANT SELECT (
  id, owner_id, property_type, listing_type, title, description, price, currency,
  negotiable, bedrooms, bathrooms, parking, area_sqm, region, district, ward,
  street, address, latitude, longitude, amenities, status, view_count,
  created_at, updated_at, floor, year_built, landmark
) ON public.properties TO anon;

CREATE POLICY "Anonymous visitors can view live properties"
ON public.properties
FOR SELECT
TO anon
USING (status = 'live'::property_status);

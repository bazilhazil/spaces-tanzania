
-- Fix 1: Recreate public_profiles as security_invoker view
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles WITH (security_invoker = true) AS
SELECT id, full_name, avatar_url, agency_name, business_name, bio, location, created_at
FROM public.profiles;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Fix 2: Hide owner contact details from unauthenticated visitors.
-- Create a safe public view excluding contact fields, and remove anon access to the base table.
CREATE OR REPLACE VIEW public.public_properties WITH (security_invoker = true) AS
SELECT id, owner_id, property_type, listing_type, title, description, price, currency,
       negotiable, bedrooms, bathrooms, parking, area_sqm, region, district, ward,
       street, address, latitude, longitude, amenities, status, view_count,
       created_at, updated_at, floor, year_built, landmark
FROM public.properties
WHERE status = 'live';
GRANT SELECT ON public.public_properties TO anon, authenticated;

-- Replace the public SELECT policy: only authenticated users (and owners/admins) can read the base
-- table which contains contact_name/contact_phone/contact_whatsapp. Anonymous users must use
-- public.public_properties.
DROP POLICY IF EXISTS "Public can view live properties" ON public.properties;
CREATE POLICY "Authenticated can view live or own properties"
  ON public.properties FOR SELECT
  TO authenticated
  USING (
    status = 'live'
    OR auth.uid() = owner_id
    OR has_role(auth.uid(), 'admin'::app_role)
  );

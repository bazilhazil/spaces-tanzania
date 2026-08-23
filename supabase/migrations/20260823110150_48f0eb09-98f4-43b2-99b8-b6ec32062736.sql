ALTER TABLE public.verification_requests
  DROP CONSTRAINT IF EXISTS verification_requests_status_check;
ALTER TABLE public.verification_requests
  ADD CONSTRAINT verification_requests_status_check
  CHECK (status IN ('pending', 'under_review', 'more_info', 'approved', 'rejected', 'expired', 'revoked'));

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (
  full_name, phone, email, avatar_url, national_id, business_name,
  agency_name, location, bio, updated_at
) ON public.profiles TO authenticated;

REVOKE UPDATE ON public.properties FROM authenticated;
GRANT UPDATE (
  owner_id, property_type, listing_type, title, description, price, currency,
  negotiable, bedrooms, bathrooms, parking, area_sqm, region, district, ward,
  street, address, latitude, longitude, amenities, status, view_count,
  updated_at, floor, year_built, landmark, preferred_contact, featured,
  rejection_reason
) ON public.properties TO authenticated;
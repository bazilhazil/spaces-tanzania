-- public_profiles intentionally exposes ONLY non-sensitive, already-public profile
-- fields. It runs as definer so anonymous visitors can read the public agent
-- directory without granting broad access to the underlying profiles table
-- (which holds email, phone and national_id).
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT
  pr.id,
  pr.full_name,
  pr.avatar_url,
  pr.agency_name,
  pr.business_name,
  pr.location,
  pr.bio,
  pr.created_at,
  pr.verified_identity,
  pr.verified_owner,
  pr.verified_agent,
  pr.verified_business
FROM public.profiles pr;

REVOKE ALL ON public.public_profiles FROM anon, authenticated;
GRANT SELECT ON public.public_profiles TO anon, authenticated;
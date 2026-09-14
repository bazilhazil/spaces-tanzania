-- Public profiles must not surface suspended or banned accounts.
CREATE OR REPLACE FUNCTION private.public_profile_rows()
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  agency_name text,
  business_name text,
  location text,
  bio text,
  created_at timestamptz,
  verified_identity boolean,
  verified_owner boolean,
  verified_agent boolean,
  verified_business boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT pr.id, pr.full_name, pr.avatar_url, pr.agency_name, pr.business_name,
         pr.location, pr.bio, pr.created_at, pr.verified_identity, pr.verified_owner,
         pr.verified_agent, pr.verified_business
  FROM public.profiles pr
  WHERE pr.account_status = 'active';
$$;
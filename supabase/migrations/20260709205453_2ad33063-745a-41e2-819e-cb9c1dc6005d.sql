
-- 1. Profiles: restrict PII exposure. Only self + admin can read the base table.
--    Non-sensitive fields are exposed through the public_profiles view.
DROP POLICY IF EXISTS "Profiles readable by everyone" ON public.profiles;

CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Public view exposing only non-PII fields for cross-user displays.
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, full_name, avatar_url, agency_name, business_name, bio, location, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 2. Storage: property-media bucket must not expose non-live property files.
DROP POLICY IF EXISTS "Anon can read property media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read property media" ON storage.objects;

CREATE POLICY "Public reads live property media"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'property-media'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND p.status = 'live'::public.property_status
    )
  );

CREATE POLICY "Owners and admins read own property media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'property-media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- 3. property_views: replace always-true INSERT policy with a scoped check.
DROP POLICY IF EXISTS "anyone logs a view" ON public.property_views;

CREATE POLICY "log view for self or anon"
  ON public.property_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    viewer_id IS NULL OR viewer_id = auth.uid()
  );

-- 4. has_role: switch to SECURITY INVOKER so it no longer counts as an
--    anon/authenticated-executable SECURITY DEFINER function. Callers always
--    pass auth.uid(), and user_roles RLS lets users read their own roles.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Lock down remaining SECURITY DEFINER functions so they cannot be called
--    directly by anon/authenticated. Triggers still fire regardless of grants.
REVOKE EXECUTE ON FUNCTION public.recompute_deal_health(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_message_touch_deal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_booking_log_deal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_deal_stage_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_conversation_create_deal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;

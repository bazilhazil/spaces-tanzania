-- 1) public_profiles: SECURITY INVOKER view backed by a private, column-safe helper
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
SET search_path = public
AS $$
  SELECT pr.id, pr.full_name, pr.avatar_url, pr.agency_name, pr.business_name,
         pr.location, pr.bio, pr.created_at, pr.verified_identity, pr.verified_owner,
         pr.verified_agent, pr.verified_business
  FROM public.profiles pr;
$$;

REVOKE ALL ON FUNCTION private.public_profile_rows() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.public_profile_rows() TO anon, authenticated, service_role;

DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles WITH (security_invoker = on) AS
  SELECT * FROM private.public_profile_rows();

GRANT SELECT ON public.public_profiles TO anon, authenticated;
GRANT ALL ON public.public_profiles TO service_role;

-- 2) SECURITY DEFINER functions in the exposed schema: move privileged bodies to
--    the private schema and expose SECURITY INVOKER wrappers.
CREATE OR REPLACE FUNCTION private.plan_id_for_user(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT COALESCE(s.plan_id, s.plan)
       FROM public.subscriptions s
      WHERE s.user_id = _user_id
        AND s.status IN ('active', 'trialing')
      ORDER BY s.created_at DESC
      LIMIT 1),
    'free'
  );
$$;
REVOKE ALL ON FUNCTION private.plan_id_for_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.plan_id_for_user(uuid) TO service_role;

-- plan_id_for_user is an internal helper: no direct API access.
REVOKE ALL ON FUNCTION public.plan_id_for_user(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.my_plan_usage()
RETURNS TABLE(plan_id text, plan_name text, listing_limit integer, agent_limit integer,
              listings_used integer, status text, current_period_end timestamptz,
              cancel_at_period_end boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _pid text;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  _pid := public.plan_id_for_user(_uid);

  RETURN QUERY
  SELECT
    COALESCE(bp.id, 'free'),
    COALESCE(bp.name, 'Free'),
    COALESCE(bp.listing_limit, NULL),
    COALESCE(bp.agent_limit, NULL),
    (SELECT COUNT(*)::int FROM public.properties p
      WHERE p.owner_id = _uid AND p.status IN ('live', 'pending', 'draft', 'paused')),
    COALESCE((SELECT s.status FROM public.subscriptions s
               WHERE s.user_id = _uid ORDER BY s.created_at DESC LIMIT 1), 'active'),
    (SELECT s.current_period_end FROM public.subscriptions s
      WHERE s.user_id = _uid ORDER BY s.created_at DESC LIMIT 1),
    COALESCE((SELECT s.cancel_at_period_end FROM public.subscriptions s
               WHERE s.user_id = _uid ORDER BY s.created_at DESC LIMIT 1), false)
  FROM (SELECT 1) x
  LEFT JOIN public.billing_plans bp ON bp.id = _pid;
END;
$$;
REVOKE ALL ON FUNCTION private.my_plan_usage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.my_plan_usage() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.my_plan_usage()
RETURNS TABLE(plan_id text, plan_name text, listing_limit integer, agent_limit integer,
              listings_used integer, status text, current_period_end timestamptz,
              cancel_at_period_end boolean)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM private.my_plan_usage();
$$;
REVOKE ALL ON FUNCTION public.my_plan_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_plan_usage() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.check_my_subscription_expiry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _s public.subscriptions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  SELECT * INTO _s FROM public.subscriptions
   WHERE user_id = auth.uid() AND status IN ('active', 'trialing')
   ORDER BY created_at DESC LIMIT 1;

  IF _s.id IS NULL OR _s.current_period_end IS NULL THEN RETURN; END IF;
  IF _s.current_period_end > now() + interval '7 days' THEN RETURN; END IF;
  IF _s.expiry_notified_at IS NOT NULL
     AND _s.expiry_notified_at > _s.current_period_start THEN RETURN; END IF;

  INSERT INTO public.notifications (user_id, kind, title, body, link, data)
  VALUES (auth.uid(), 'billing',
          CASE WHEN _s.current_period_end < now() THEN 'Your plan has expired' ELSE 'Your plan expires soon' END,
          'Renew to keep your listing allowance and plan features.',
          '/billing', jsonb_build_object('subscription_id', _s.id));

  UPDATE public.subscriptions SET expiry_notified_at = now(), updated_at = now() WHERE id = _s.id;

  IF _s.current_period_end < now() THEN
    UPDATE public.subscriptions SET status = 'expired', updated_at = now() WHERE id = _s.id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION private.check_my_subscription_expiry() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.check_my_subscription_expiry() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.check_my_subscription_expiry()
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.check_my_subscription_expiry();
$$;
REVOKE ALL ON FUNCTION public.check_my_subscription_expiry() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_my_subscription_expiry() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.admin_set_payment_status(_payment_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;
  IF _status NOT IN ('succeeded', 'failed', 'refunded', 'pending') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  UPDATE public.payments SET status = _status, updated_at = now() WHERE id = _payment_id;
END;
$$;
REVOKE ALL ON FUNCTION private.admin_set_payment_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.admin_set_payment_status(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_payment_status(_payment_id uuid, _status text)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.admin_set_payment_status(_payment_id, _status);
$$;
REVOKE ALL ON FUNCTION public.admin_set_payment_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_payment_status(uuid, text) TO authenticated, service_role;

-- 3) Prevent actor / uploader spoofing on deal records
DROP POLICY IF EXISTS "Deal activities insert by participants" ON public.deal_activities;
CREATE POLICY "Deal activities insert by participants"
ON public.deal_activities
FOR INSERT
TO authenticated
WITH CHECK (
  (actor_id IS NULL OR actor_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_activities.deal_id
      AND (d.buyer_id = auth.uid() OR d.owner_id = auth.uid() OR d.agent_id = auth.uid()
           OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  )
);

DROP POLICY IF EXISTS "Deal documents insert by participants" ON public.deal_documents;
CREATE POLICY "Deal documents insert by participants"
ON public.deal_documents
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_documents.deal_id
      AND (d.buyer_id = auth.uid() OR d.owner_id = auth.uid() OR d.agent_id = auth.uid()
           OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  )
);
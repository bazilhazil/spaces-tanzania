ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ref_code text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS areas_served text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS services text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience_years int;
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS location text;

CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  code text NOT NULL,
  source text NOT NULL DEFAULT 'referral',
  campaign text,
  status text NOT NULL DEFAULT 'signed_up' CHECK (status IN ('signed_up','active','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own referrals" ON public.referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_user_id = auth.uid()
    OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE OR REPLACE FUNCTION public.my_ref_code() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT ref_code INTO _c FROM profiles WHERE id = auth.uid();
  IF _c IS NULL THEN
    LOOP
      _c := upper(substr(md5(random()::text || auth.uid()::text), 1, 7));
      BEGIN
        UPDATE profiles SET ref_code = _c WHERE id = auth.uid();
        EXIT;
      EXCEPTION WHEN unique_violation THEN END;
    END LOOP;
  END IF;
  RETURN _c;
END $$;
GRANT EXECUTE ON FUNCTION public.my_ref_code() TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_referral(_code text, _source text DEFAULT 'referral', _campaign text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ref uuid;
BEGIN
  IF auth.uid() IS NULL OR coalesce(trim(_code),'') = '' THEN RETURN false; END IF;
  SELECT id INTO _ref FROM profiles WHERE ref_code = upper(trim(_code));
  IF _ref IS NULL OR _ref = auth.uid() THEN RETURN false; END IF;
  INSERT INTO referrals(referrer_id, referred_user_id, code, source, campaign)
  VALUES (_ref, auth.uid(), upper(trim(_code)), left(coalesce(_source,'referral'),40), left(_campaign,80))
  ON CONFLICT (referred_user_id) DO NOTHING;
  RETURN FOUND;
END $$;
GRANT EXECUTE ON FUNCTION public.claim_referral(text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_marketplace_overview(_days int DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _since timestamptz := CASE WHEN _days IS NULL THEN '-infinity'::timestamptz ELSE now() - make_interval(days => _days) END;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  RETURN jsonb_build_object(
    'users', (SELECT count(*) FROM profiles WHERE created_at >= _since),
    'owners', (SELECT count(DISTINCT r.user_id) FROM user_roles r JOIN profiles p ON p.id=r.user_id WHERE r.role='owner' AND p.created_at >= _since),
    'dalalis', (SELECT count(DISTINCT r.user_id) FROM user_roles r JOIN profiles p ON p.id=r.user_id WHERE r.role='agent' AND p.created_at >= _since),
    'agencies', (SELECT count(*) FROM agencies WHERE created_at >= _since),
    'properties', (SELECT count(*) FROM properties WHERE deleted_at IS NULL AND created_at >= _since),
    'active_listings', (SELECT count(*) FROM properties WHERE deleted_at IS NULL AND status='live' AND created_at >= _since),
    'verified_listings', (SELECT count(*) FROM properties WHERE deleted_at IS NULL AND verified AND created_at >= _since),
    'inquiries', (SELECT count(*) FROM leads WHERE created_at >= _since),
    'offers', (SELECT count(*) FROM offers WHERE created_at >= _since),
    'active_deals', (SELECT count(*) FROM deals WHERE stage NOT IN ('completed','cancelled') AND created_at >= _since),
    'completed_deals', (SELECT count(*) FROM deals WHERE stage='completed' AND updated_at >= _since),
    'transaction_value', (SELECT coalesce(sum(agreed_price),0) FROM deals WHERE stage='completed' AND updated_at >= _since),
    'spaces_revenue', (SELECT coalesce(sum(amount),0) FROM payments WHERE status IN ('paid','succeeded') AND NOT coalesce(is_test,false) AND created_at >= _since),
    'dalali_commissions', (SELECT coalesce(sum(amount),0) FROM deal_commissions WHERE created_at >= _since),
    'referrals', (SELECT count(*) FROM referrals WHERE created_at >= _since)
  );
END $$;
GRANT EXECUTE ON FUNCTION public.admin_marketplace_overview(int) TO authenticated;
-- 1. PLANS -------------------------------------------------------------
CREATE TABLE public.billing_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  price_monthly numeric NOT NULL DEFAULT 0,
  price_annual numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TZS',
  listing_limit integer,              -- NULL = unlimited
  agent_limit integer,                -- NULL = unlimited
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  badge text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.billing_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_plans TO authenticated;
GRANT ALL ON public.billing_plans TO service_role;
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active plans" ON public.billing_plans
  FOR SELECT USING (active OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins insert plans" ON public.billing_plans
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins update plans" ON public.billing_plans
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins delete plans" ON public.billing_plans
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER billing_plans_updated_at BEFORE UPDATE ON public.billing_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.billing_plans (id, name, tagline, price_monthly, price_annual, listing_limit, agent_limit, features, badge, sort_order) VALUES
  ('free', 'Free', 'Start listing on SPACES', 0, 0, 3, 1,
   '["Up to 3 active listings","Receive inquiries","Receive viewing requests","Basic profile","Messaging with buyers"]'::jsonb,
   NULL, 1),
  ('pro', 'Pro', 'For serious owners and solo agents', 49000, 490000, 25, 1,
   '["Up to 25 active listings","Enhanced listing visibility","Property analytics","Priority support","Professional profile"]'::jsonb,
   'Most popular', 2),
  ('agency', 'Agency', 'Scale your team and brand', 149000, 1490000, NULL, NULL,
   '["Unlimited active listings","Multiple agent seats","Team management","Advanced analytics","Lead management","Agency profile"]'::jsonb,
   NULL, 3);

-- 2. PROMOTION PRODUCTS -------------------------------------------------
CREATE TABLE public.promotion_products (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TZS',
  duration_days integer NOT NULL DEFAULT 7,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.promotion_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotion_products TO authenticated;
GRANT ALL ON public.promotion_products TO service_role;
ALTER TABLE public.promotion_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active promotion products" ON public.promotion_products
  FOR SELECT USING (active OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins insert promotion products" ON public.promotion_products
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins update promotion products" ON public.promotion_products
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins delete promotion products" ON public.promotion_products
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER promotion_products_updated_at BEFORE UPDATE ON public.promotion_products
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.promotion_products (id, name, description, price, duration_days, sort_order) VALUES
  ('featured', 'Featured', 'Highlighted listing card across search results.', 25000, 7, 1),
  ('premium', 'Premium', 'Premium badge plus homepage exposure.', 75000, 14, 2),
  ('top_search', 'Top Search Placement', 'Pinned to the top of relevant search results.', 60000, 7, 3);

-- 3. PROPERTY PROMOTIONS ------------------------------------------------
CREATE TABLE public.property_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.promotion_products(id),
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending_payment',
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TZS',
  duration_days integer NOT NULL DEFAULT 7,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.property_promotions TO authenticated;
GRANT ALL ON public.property_promotions TO service_role;
ALTER TABLE public.property_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own promotions" ON public.property_promotions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users create own promotions" ON public.property_promotions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending_payment'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
        AND (p.owner_id = auth.uid() OR public.agent_permission_for(p.id, auth.uid()) IS NOT NULL)
    )
  );
CREATE POLICY "Admins update promotions" ON public.property_promotions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER property_promotions_updated_at BEFORE UPDATE ON public.property_promotions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_property_promotions_property ON public.property_promotions(property_id, status);
CREATE INDEX idx_property_promotions_user ON public.property_promotions(user_id, created_at DESC);

-- 4. PAYMENT / SUBSCRIPTION LINKAGE -------------------------------------
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS plan_id text REFERENCES public.billing_plans(id),
  ADD COLUMN IF NOT EXISTS billing_cycle text;

CREATE INDEX IF NOT EXISTS idx_payments_purpose ON public.payments(purpose, status, created_at DESC);

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_id text REFERENCES public.billing_plans(id),
  ADD COLUMN IF NOT EXISTS expiry_notified_at timestamptz;

UPDATE public.subscriptions SET plan_id = 'free' WHERE plan_id IS NULL AND plan IN ('free', 'Free');

-- 5. PLAN LIMITS + LISTING QUOTA ENFORCEMENT ----------------------------
CREATE OR REPLACE FUNCTION public.plan_id_for_user(_user_id uuid)
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

CREATE OR REPLACE FUNCTION public.my_plan_usage()
RETURNS TABLE(
  plan_id text,
  plan_name text,
  listing_limit integer,
  agent_limit integer,
  listings_used integer,
  status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean
)
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

GRANT EXECUTE ON FUNCTION public.plan_id_for_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_plan_usage() TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_enforce_listing_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _limit integer;
  _used integer;
BEGIN
  SELECT bp.listing_limit INTO _limit
    FROM public.billing_plans bp
   WHERE bp.id = public.plan_id_for_user(NEW.owner_id);

  IF _limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO _used
    FROM public.properties p
   WHERE p.owner_id = NEW.owner_id
     AND p.status IN ('live', 'pending', 'draft', 'paused');

  IF _used >= _limit THEN
    RAISE EXCEPTION 'LISTING_LIMIT_REACHED'
      USING HINT = 'Upgrade your plan to add more active listings.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER properties_enforce_listing_limit
  BEFORE INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.tg_enforce_listing_limit();
ALTER TABLE public.billing_plans
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS billing_frequency text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS target_roles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS unit_limit integer,
  ADD COLUMN IF NOT EXISTS team_limit integer,
  ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_inclusive boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS effective_from date NOT NULL DEFAULT current_date;

ALTER TABLE public.promotion_products
  ADD COLUMN IF NOT EXISTS placement text NOT NULL DEFAULT 'search',
  ADD COLUMN IF NOT EXISTS priority_score integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS badge_label text NOT NULL DEFAULT 'Featured',
  ADD COLUMN IF NOT EXISTS target_roles text[] NOT NULL DEFAULT '{owner,agent}',
  ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS effective_from date NOT NULL DEFAULT current_date;

CREATE TABLE public.pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type text NOT NULL CHECK (rule_type IN ('transaction_fee','rental_fee','commission','tax','discount','service_fee')),
  name text NOT NULL,
  description text,
  applies_to text NOT NULL DEFAULT 'any' CHECK (applies_to IN ('any','sale','rent','developer')),
  payer text NOT NULL DEFAULT 'buyer' CHECK (payer IN ('buyer','seller','agent','tenant','landlord','any')),
  percentage numeric NOT NULL DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
  fixed_amount numeric NOT NULL DEFAULT 0 CHECK (fixed_amount >= 0),
  min_amount numeric,
  max_amount numeric,
  tax_rate numeric NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  currency text NOT NULL DEFAULT 'TZS',
  target_roles text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  effective_from date NOT NULL DEFAULT current_date,
  effective_to date,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pricing_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_rules TO authenticated;
GRANT ALL ON public.pricing_rules TO service_role;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active pricing rules" ON public.pricing_rules FOR SELECT TO anon, authenticated
  USING (active OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admins insert pricing rules" ON public.pricing_rules FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admins update pricing rules" ON public.pricing_rules FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Super admins delete pricing rules" ON public.pricing_rules FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.pricing_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id text NOT NULL,
  action text NOT NULL,
  changed_by uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pricing_change_log TO authenticated;
GRANT ALL ON public.pricing_change_log TO service_role;
ALTER TABLE public.pricing_change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read pricing log" ON public.pricing_change_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE OR REPLACE FUNCTION public.tg_log_pricing_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old jsonb; _new jsonb; _id text;
BEGIN
  IF TG_OP = 'DELETE' THEN _old := to_jsonb(OLD); _id := _old->>'id';
  ELSIF TG_OP = 'INSERT' THEN _new := to_jsonb(NEW); _id := _new->>'id';
  ELSE
    _old := to_jsonb(OLD); _new := to_jsonb(NEW); _id := _new->>'id';
    IF (_old - 'updated_at') = (_new - 'updated_at') THEN RETURN NEW; END IF;
  END IF;
  INSERT INTO public.pricing_change_log(table_name, record_id, action, changed_by, old_values, new_values)
  VALUES (TG_TABLE_NAME, _id, TG_OP, auth.uid(), _old, _new);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER log_pricing_rules BEFORE INSERT OR UPDATE OR DELETE ON public.pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.tg_log_pricing_change();
CREATE TRIGGER log_billing_plans BEFORE INSERT OR UPDATE OR DELETE ON public.billing_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_log_pricing_change();
CREATE TRIGGER log_promotion_products BEFORE INSERT OR UPDATE OR DELETE ON public.promotion_products
  FOR EACH ROW EXECUTE FUNCTION public.tg_log_pricing_change();

CREATE OR REPLACE FUNCTION public.my_monetization_summary()
RETURNS TABLE(leads_count bigint, open_deals bigint, won_deals bigint, commission_value numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM public.leads l WHERE l.owner_id = auth.uid() AND l.deleted_at IS NULL),
    (SELECT count(*) FROM public.deals d WHERE (d.agent_id = auth.uid() OR d.owner_id = auth.uid()) AND d.deleted_at IS NULL AND d.completed_at IS NULL),
    (SELECT count(*) FROM public.deals d WHERE (d.agent_id = auth.uid() OR d.owner_id = auth.uid()) AND d.deleted_at IS NULL AND d.completed_at IS NOT NULL),
    0::numeric;
$$;
GRANT EXECUTE ON FUNCTION public.my_monetization_summary() TO authenticated;
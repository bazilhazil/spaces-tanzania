REVOKE ALL ON FUNCTION public.tg_payment_status_effects() FROM PUBLIC, anon, authenticated;

-- Subscriptions: read-own, but no self-service plan changes.
DROP POLICY IF EXISTS "own subscription" ON public.subscriptions;

CREATE POLICY "read own subscription" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.tg_guard_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- trigger/definer context
  END IF;
  IF TG_OP = 'UPDATE' AND auth.uid() = NEW.user_id THEN
    IF NEW.plan IS DISTINCT FROM OLD.plan
       OR NEW.plan_id IS DISTINCT FROM OLD.plan_id
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.billing_cycle IS DISTINCT FROM OLD.billing_cycle
       OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end THEN
      RAISE EXCEPTION 'plan changes require a confirmed payment';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_guard_subscription() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS subscriptions_guard ON public.subscriptions;
CREATE TRIGGER subscriptions_guard
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_subscription();

CREATE POLICY "cancel own subscription" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Payments: user-created rows always start pending.
CREATE OR REPLACE FUNCTION public.tg_guard_payment_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    NEW.status := 'pending';
    NEW.subscription_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_guard_payment_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS payments_guard_insert ON public.payments;
CREATE TRIGGER payments_guard_insert
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_payment_insert();
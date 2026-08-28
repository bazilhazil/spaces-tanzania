-- Activate paid features ONLY when a payment is confirmed.
CREATE OR REPLACE FUNCTION public.tg_payment_status_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan public.billing_plans%ROWTYPE;
  _months integer;
  _end timestamptz;
  _promo public.property_promotions%ROWTYPE;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('succeeded', 'paid') THEN
    -- Subscription purchases
    IF NEW.purpose = 'subscription' AND NEW.plan_id IS NOT NULL THEN
      SELECT * INTO _plan FROM public.billing_plans WHERE id = NEW.plan_id;
      _months := CASE WHEN NEW.billing_cycle = 'annual' THEN 12 ELSE 1 END;
      _end := now() + (_months || ' months')::interval;

      UPDATE public.subscriptions s
         SET plan = NEW.plan_id,
             plan_id = NEW.plan_id,
             status = 'active',
             billing_cycle = COALESCE(NEW.billing_cycle, 'monthly'),
             current_period_start = now(),
             current_period_end = _end,
             cancel_at_period_end = false,
             expiry_notified_at = NULL,
             updated_at = now()
       WHERE s.user_id = NEW.user_id;

      IF NOT FOUND THEN
        INSERT INTO public.subscriptions (user_id, plan, plan_id, status, billing_cycle, current_period_start, current_period_end)
        VALUES (NEW.user_id, NEW.plan_id, NEW.plan_id, 'active', COALESCE(NEW.billing_cycle, 'monthly'), now(), _end);
      END IF;

      UPDATE public.payments SET subscription_id = (
        SELECT id FROM public.subscriptions WHERE user_id = NEW.user_id ORDER BY updated_at DESC LIMIT 1
      ) WHERE id = NEW.id AND subscription_id IS NULL;

      INSERT INTO public.notifications (user_id, kind, title, body, link, data)
      VALUES (NEW.user_id, 'billing',
              COALESCE(_plan.name, NEW.plan_id) || ' plan is active',
              'Your payment was confirmed. Your plan runs until ' || to_char(_end, 'DD Mon YYYY') || '.',
              '/billing', jsonb_build_object('payment_id', NEW.id, 'plan_id', NEW.plan_id));
    END IF;

    -- Promotion purchases
    FOR _promo IN SELECT * FROM public.property_promotions WHERE payment_id = NEW.id AND status = 'pending_payment' LOOP
      UPDATE public.property_promotions
         SET status = 'active',
             starts_at = now(),
             ends_at = now() + (_promo.duration_days || ' days')::interval,
             updated_at = now()
       WHERE id = _promo.id;

      UPDATE public.properties SET featured = true WHERE id = _promo.property_id;

      INSERT INTO public.notifications (user_id, kind, title, body, link, data)
      VALUES (NEW.user_id, 'billing', 'Listing promotion is live',
              'Your promotion runs for ' || _promo.duration_days || ' days.',
              '/billing', jsonb_build_object('promotion_id', _promo.id));
    END LOOP;

  ELSIF NEW.status IN ('failed', 'cancelled') THEN
    UPDATE public.property_promotions
       SET status = 'failed', updated_at = now()
     WHERE payment_id = NEW.id AND status = 'pending_payment';

    INSERT INTO public.notifications (user_id, kind, title, body, link, data)
    VALUES (NEW.user_id, 'billing', 'Payment not completed',
            'We could not confirm your payment. Your current plan has not changed - you can retry from Billing.',
            '/billing', jsonb_build_object('payment_id', NEW.id));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_status_effects ON public.payments;
CREATE TRIGGER payments_status_effects
  AFTER UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_payment_status_effects();

-- Admin-only payment confirmation / failure (manual reconciliation).
CREATE OR REPLACE FUNCTION public.admin_set_payment_status(_payment_id uuid, _status text)
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

REVOKE ALL ON FUNCTION public.admin_set_payment_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_payment_status(uuid, text) TO authenticated;

-- One expiry reminder per billing period.
CREATE OR REPLACE FUNCTION public.check_my_subscription_expiry()
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

REVOKE ALL ON FUNCTION public.check_my_subscription_expiry() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_my_subscription_expiry() TO authenticated;
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS provider_reference text,
  ADD COLUMN IF NOT EXISTS gateway_url text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS payments_reference_key ON public.payments (reference) WHERE reference IS NOT NULL;

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

  ELSIF NEW.status = 'refunded' THEN
    UPDATE public.property_promotions
       SET status = 'cancelled', ends_at = now(), updated_at = now()
     WHERE payment_id = NEW.id AND status = 'active';

    INSERT INTO public.notifications (user_id, kind, title, body, link, data)
    VALUES (NEW.user_id, 'billing', 'Payment refunded',
            'This payment has been refunded. Any service it paid for is no longer active.',
            '/billing', jsonb_build_object('payment_id', NEW.id));

  ELSIF NEW.status IN ('failed', 'cancelled', 'expired') THEN
    UPDATE public.property_promotions
       SET status = 'failed', updated_at = now()
     WHERE payment_id = NEW.id AND status = 'pending_payment';

    INSERT INTO public.notifications (user_id, kind, title, body, link, data)
    VALUES (NEW.user_id, 'billing', 'Payment not completed',
            'Payment was not completed. You have not been charged by SPACES - you can try again from Billing.',
            '/billing', jsonb_build_object('payment_id', NEW.id));
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_payment_status_effects() FROM PUBLIC, anon, authenticated;

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
  IF _status NOT IN ('paid', 'succeeded', 'processing', 'failed', 'refunded', 'cancelled', 'expired', 'pending') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  UPDATE public.payments
     SET status = _status,
         paid_at = CASE WHEN _status IN ('paid','succeeded') THEN now() ELSE paid_at END,
         refunded_at = CASE WHEN _status = 'refunded' THEN now() ELSE refunded_at END,
         updated_at = now()
   WHERE id = _payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_payment_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_payment_status(uuid, text) TO authenticated;

INSERT INTO public.admin_settings (key, value)
VALUES ('bank_transfer_details', jsonb_build_object(
  'bank_name', '', 'account_name', 'SPACES', 'account_number', '', 'branch', '', 'swift', '',
  'instructions', 'Use your payment reference as the transfer description, then send the receipt to support.'
))
ON CONFLICT (key) DO NOTHING;
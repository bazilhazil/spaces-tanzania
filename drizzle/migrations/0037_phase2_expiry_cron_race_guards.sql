-- lovable-cron-fallback-reviewed: offer expiry is time-based (expires_at) with no triggering row change; user explicitly requires server-side expiry; 15-minute backstop, reads still expire instantly.
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.expire_offers()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE o record; n int := 0;
BEGIN
  FOR o IN UPDATE public.offers SET status='expired', expired_at=now(), updated_at=now()
    WHERE status IN ('submitted','viewed') AND expires_at IS NOT NULL AND expires_at < now() RETURNING * LOOP
    n := n + 1;
    INSERT INTO public.deal_audit_log(deal_id, offer_id, actor_id, action, label, amount) VALUES (o.deal_id, o.id, NULL, 'offer_expired', 'Offer expired', o.amount);
    INSERT INTO public.notifications(user_id, kind, title, body, link, data, dedupe_key) VALUES
      (o.buyer_id,'offer_expired','Offer expired','An offer on your deal expired.','/deals?deal='||o.deal_id, jsonb_build_object('deal_id',o.deal_id),'exp-b:'||o.id),
      (COALESCE(o.owner_id,o.buyer_id),'offer_expired','Offer expired','An offer on your deal expired.','/deals?deal='||o.deal_id, jsonb_build_object('deal_id',o.deal_id),'exp-o:'||o.id)
    ON CONFLICT DO NOTHING;
    UPDATE public.properties p SET availability='available'
     WHERE p.id=o.property_id AND p.availability IN ('offer_received','negotiation')
       AND NOT EXISTS (SELECT 1 FROM public.offers x WHERE x.property_id=o.property_id AND x.status IN ('submitted','viewed','accepted') AND x.id<>o.id)
       AND NOT EXISTS (SELECT 1 FROM public.deals d WHERE d.property_id=o.property_id AND d.stage IN ('offer_accepted','agreement_signed','verification','payment','completed'));
  END LOOP;
  RETURN n;
END $function$;

DO $$ BEGIN PERFORM cron.unschedule('spaces-expire-offers'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('spaces-expire-offers', '*/15 * * * *', $$SELECT public.expire_offers();$$);

CREATE UNIQUE INDEX IF NOT EXISTS offers_one_accepted_per_deal ON public.offers(deal_id) WHERE status='accepted';

CREATE OR REPLACE FUNCTION public.tg_guard_offer_accept()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status='accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    PERFORM 1 FROM public.properties WHERE id=NEW.property_id FOR UPDATE;
    IF EXISTS (SELECT 1 FROM public.deals d WHERE d.property_id=NEW.property_id AND d.id<>NEW.deal_id
               AND d.stage IN ('offer_accepted','agreement_signed','verification','payment','completed')) THEN
      RAISE EXCEPTION 'Another offer on this property has already been accepted.' USING ERRCODE='23505';
    END IF;
    IF EXISTS (SELECT 1 FROM public.properties WHERE id=NEW.property_id AND availability IN ('sold','rented')) THEN
      RAISE EXCEPTION 'This property is no longer available.' USING ERRCODE='23505';
    END IF;
  END IF;
  RETURN NEW;
END $function$;
DROP TRIGGER IF EXISTS guard_offer_accept ON public.offers;
CREATE TRIGGER guard_offer_accept BEFORE UPDATE OF status ON public.offers FOR EACH ROW EXECUTE FUNCTION public.tg_guard_offer_accept();

CREATE OR REPLACE FUNCTION public.tg_guard_deal_completed()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.stage='completed' THEN
    NEW.completed_at := OLD.completed_at;
    IF NEW.stage <> 'completed' AND current_user IN ('authenticated','anon') AND NOT public.has_role(auth.uid(),'admin') THEN
      RAISE EXCEPTION 'A completed deal cannot be reopened.';
    END IF;
  END IF;
  RETURN NEW;
END $function$;
DROP TRIGGER IF EXISTS guard_deal_completed ON public.deals;
CREATE TRIGGER guard_deal_completed BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.tg_guard_deal_completed();

CREATE OR REPLACE FUNCTION public.simulate_test_payment(_deal_id uuid)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_pay uuid; n int := 0; it record; d public.deals%ROWTYPE;
BEGIN
  IF NOT public.payment_test_mode_enabled() THEN RAISE EXCEPTION 'Test payment mode is off, or you are not an admin.'; END IF;
  SELECT * INTO d FROM public.deals WHERE id=_deal_id FOR UPDATE;
  IF d.stage::text <> 'payment' THEN RAISE EXCEPTION 'The deal must be at the payment step.'; END IF;
  FOR it IN SELECT * FROM public.deal_payment_items WHERE deal_id=_deal_id AND status IN ('pending','processing','failed') AND amount > 0 FOR UPDATE LOOP
    INSERT INTO public.payments(user_id, provider, amount, currency, status, reference, purpose, metadata, paid_at)
    VALUES (auth.uid(), 'test_mode', it.amount, it.currency, 'paid', 'TEST-'||upper(substr(md5(random()::text),1,10)), 'deal_test',
      jsonb_build_object('test', true, 'deal_id', _deal_id, 'item', it.kind, 'note', 'Test payment — not a real payment'), now())
    RETURNING id INTO v_pay;
    UPDATE public.deal_payment_items SET is_test=true, payment_id=v_pay, status='paid' WHERE id=it.id;
    n := n + 1;
  END LOOP;
  PERFORM public.advance_deal(_deal_id);
  RETURN n;
END $function$;

CREATE OR REPLACE FUNCTION public.confirm_deal_completion(_deal_id uuid)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE d public.deals%ROWTYPE; v_uid uuid := auth.uid();
BEGIN
  SELECT * INTO d FROM public.deals WHERE id=_deal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deal not found.'; END IF;
  IF d.stage::text <> 'payment' THEN RAISE EXCEPTION 'Completion can be confirmed once verification is done.'; END IF;
  IF v_uid = d.buyer_id THEN UPDATE public.deals SET buyer_confirmed_at=now() WHERE id=_deal_id;
  ELSIF v_uid = d.owner_id OR v_uid = d.agent_id THEN UPDATE public.deals SET seller_confirmed_at=now() WHERE id=_deal_id;
  ELSE RAISE EXCEPTION 'You are not part of this deal.'; END IF;
  PERFORM private.deal_audit(_deal_id, NULL, 'completion_confirmed', 'Completion confirmed', NULL, NULL, NULL, NULL);
  SELECT * INTO d FROM public.deals WHERE id=_deal_id;
  IF d.buyer_confirmed_at IS NOT NULL AND d.seller_confirmed_at IS NOT NULL THEN
    UPDATE public.deal_checklist_items SET completed_at=now() WHERE deal_id=_deal_id AND key='completion_confirmation' AND completed_at IS NULL;
  END IF;
  RETURN public.advance_deal(_deal_id);
END $function$;
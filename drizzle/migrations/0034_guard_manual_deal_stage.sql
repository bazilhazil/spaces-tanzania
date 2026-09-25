-- Once a deal is driven by the offer engine, users may not move it by hand
-- (drag/drop or the stage dropdown). The engine's SECURITY DEFINER functions
-- run as the function owner, so they are unaffected. Admins keep an override.
CREATE OR REPLACE FUNCTION public.tg_guard_manual_deal_stage()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage
     AND current_user IN ('authenticated','anon')
     AND NEW.stage <> 'cancelled'
     AND NOT public.has_role(auth.uid(), 'admin')
     AND (
       OLD.stage IN ('offer_made','negotiation','offer_accepted','verification','agreement_signed','payment','completed')
       OR NEW.stage IN ('offer_made','negotiation','offer_accepted','verification','agreement_signed','payment','completed')
       OR EXISTS (SELECT 1 FROM public.offers o WHERE o.deal_id = NEW.id)
     )
  THEN
    RAISE EXCEPTION 'This stage updates automatically from offers, verification and payments.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_manual_deal_stage ON public.deals;
CREATE TRIGGER guard_manual_deal_stage BEFORE UPDATE OF stage ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_manual_deal_stage();

-- Owner should also be told when an agreement is reached (buyer and Dalali already are).
CREATE OR REPLACE FUNCTION public.tg_offer_accept_notify_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_title text;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    SELECT d.owner_id, p.title INTO v_owner, v_title FROM public.deals d LEFT JOIN public.properties p ON p.id = d.property_id WHERE d.id = NEW.deal_id;
    IF v_owner IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, kind, title, body, data, dedupe_key)
      VALUES (v_owner, 'offer_accepted', 'Agreement reached',
              'Agreement reached on ' || COALESCE(v_title,'your property') || '. Next: verification.',
              jsonb_build_object('deal_id', NEW.deal_id, 'offer_id', NEW.id),
              'offer_accepted_owner:' || NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS offer_accept_notify_owner ON public.offers;
CREATE TRIGGER offer_accept_notify_owner AFTER UPDATE OF status ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.tg_offer_accept_notify_owner();
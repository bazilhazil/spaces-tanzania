-- When an offer is declined, withdrawn or expired: tell the other side about
-- withdrawals, and put the property back to Available when no other offer is
-- still open or accepted on it.
CREATE OR REPLACE FUNCTION public.tg_offer_close_effects()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text; v_target uuid;
BEGIN
  IF NEW.status IN ('declined','withdrawn','expired') AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'withdrawn' THEN
      SELECT title INTO v_title FROM public.properties WHERE id = NEW.property_id;
      v_target := CASE WHEN NEW.made_by_side = 'buyer' THEN NEW.owner_id ELSE NEW.buyer_id END;
      IF v_target IS NOT NULL THEN
        INSERT INTO public.notifications(user_id, kind, title, body, link, data, dedupe_key)
        VALUES (v_target, 'offer_withdrawn', 'Offer withdrawn',
                'An offer on ' || COALESCE(v_title,'the property') || ' was withdrawn.',
                '/deals?deal=' || NEW.deal_id, jsonb_build_object('deal_id', NEW.deal_id, 'offer_id', NEW.id),
                'offer_withdrawn:' || NEW.id)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.offers o WHERE o.property_id = NEW.property_id AND o.id <> NEW.id
                   AND o.status IN ('submitted','viewed','accepted')) THEN
      UPDATE public.properties SET availability = 'available'
       WHERE id = NEW.property_id AND availability IN ('offer_received','negotiation');
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS offer_close_effects ON public.offers;
CREATE TRIGGER offer_close_effects AFTER UPDATE OF status ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.tg_offer_close_effects();
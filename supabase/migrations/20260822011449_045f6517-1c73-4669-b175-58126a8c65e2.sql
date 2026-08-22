
-- 1. Lead workflow columns
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 2. Duplicate protection
-- merge pre-existing duplicate leads (keep the newest per visitor+property)
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY property_id, visitor_id ORDER BY created_at DESC) AS rn
  FROM public.leads WHERE visitor_id IS NOT NULL AND status NOT IN ('won','lost')
)
UPDATE public.leads l SET status = 'lost'
FROM ranked r WHERE l.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS leads_unique_active_visitor_property
  ON public.leads (property_id, visitor_id)
  WHERE visitor_id IS NOT NULL AND status NOT IN ('won','lost');

WITH bdup AS (
  SELECT id, row_number() OVER (PARTITION BY property_id, buyer_id ORDER BY created_at DESC) AS rn
  FROM public.bookings WHERE status IN ('pending','approved','rescheduled')
)
UPDATE public.bookings b SET status = 'cancelled'
FROM bdup d WHERE b.id = d.id AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_unique_active_buyer_property
  ON public.bookings (property_id, buyer_id)
  WHERE status IN ('pending','approved','rescheduled');


CREATE UNIQUE INDEX IF NOT EXISTS deals_unique_active_buyer_property
  ON public.deals (property_id, buyer_id)
  WHERE buyer_id IS NOT NULL AND property_id IS NOT NULL
    AND stage NOT IN ('completed','cancelled');

-- 3. Touch lead activity helper
CREATE OR REPLACE FUNCTION public.set_lead_status(_lead_id uuid, _status text, _force boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _lead_id IS NULL THEN RETURN; END IF;
  UPDATE public.leads
    SET status = CASE WHEN _force OR status NOT IN ('won','lost') THEN _status ELSE status END,
        last_activity_at = now()
    WHERE id = _lead_id;
END; $$;

-- 4. Viewing status -> lead status
CREATE OR REPLACE FUNCTION public.tg_booking_sync_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.lead_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.set_lead_status(NEW.lead_id, 'new');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM public.set_lead_status(NEW.lead_id, 'viewing_scheduled');
    ELSIF NEW.status = 'completed' THEN
      PERFORM public.set_lead_status(NEW.lead_id, 'viewing_completed');
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS booking_sync_lead ON public.bookings;
CREATE TRIGGER booking_sync_lead
AFTER INSERT OR UPDATE OF status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_booking_sync_lead();

-- 5. New lead -> notify owner
CREATE OR REPLACE FUNCTION public.tg_lead_created_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text;
BEGIN
  SELECT title INTO v_title FROM public.properties WHERE id = NEW.property_id;
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link, data)
    VALUES (NEW.owner_id, 'lead_created', 'New lead',
            COALESCE(NEW.visitor_name,'Someone') || ' inquired about ' || COALESCE(v_title,'a property'),
            '/leads', jsonb_build_object('lead_id', NEW.id, 'property_id', NEW.property_id));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS lead_created_notify ON public.leads;
CREATE TRIGGER lead_created_notify
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.tg_lead_created_notify();

-- 6. Deal created -> link lead + notify
CREATE OR REPLACE FUNCTION public.tg_deal_created_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lead uuid;
BEGIN
  v_lead := NEW.lead_id;
  IF v_lead IS NULL AND NEW.property_id IS NOT NULL AND NEW.buyer_id IS NOT NULL THEN
    SELECT id INTO v_lead FROM public.leads
      WHERE property_id = NEW.property_id AND visitor_id = NEW.buyer_id
      ORDER BY created_at DESC LIMIT 1;
    IF v_lead IS NOT NULL THEN
      UPDATE public.deals SET lead_id = v_lead WHERE id = NEW.id;
    END IF;
  END IF;
  IF v_lead IS NOT NULL THEN
    UPDATE public.leads SET deal_id = NEW.id, last_activity_at = now() WHERE id = v_lead;
  END IF;

  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link, data)
    VALUES (NEW.owner_id, 'deal_created', 'Deal created', 'Deal ' || NEW.reference || ' was created',
            '/deals', jsonb_build_object('deal_id', NEW.id));
  END IF;
  IF NEW.agent_id IS NOT NULL AND NEW.agent_id <> COALESCE(NEW.owner_id,'00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link, data)
    VALUES (NEW.agent_id, 'deal_created', 'Deal created', 'Deal ' || NEW.reference || ' was created',
            '/deals', jsonb_build_object('deal_id', NEW.id));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS deal_created_link ON public.deals;
CREATE TRIGGER deal_created_link
AFTER INSERT ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.tg_deal_created_link();

-- 7. Deal completion / cancellation -> lead outcome + completion date
CREATE OR REPLACE FUNCTION public.tg_deal_outcome_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    IF NEW.stage = 'completed' THEN
      NEW.completed_at := COALESCE(NEW.completed_at, now());
      PERFORM public.set_lead_status(NEW.lead_id, 'won', true);
    ELSIF NEW.stage = 'cancelled' THEN
      PERFORM public.set_lead_status(NEW.lead_id, 'lost', true);
    ELSIF NEW.lead_id IS NOT NULL THEN
      PERFORM public.set_lead_status(NEW.lead_id,
        CASE NEW.stage
          WHEN 'contacted' THEN 'contacted'
          WHEN 'viewing_scheduled' THEN 'viewing_scheduled'
          WHEN 'viewing_completed' THEN 'viewing_completed'
          WHEN 'negotiation' THEN 'negotiating'
          WHEN 'offer_made' THEN 'offer_made'
          WHEN 'offer_accepted' THEN 'offer_made'
          WHEN 'agreement_signed' THEN 'offer_made'
          ELSE 'new'
        END);
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS deal_outcome_sync ON public.deals;
CREATE TRIGGER deal_outcome_sync
BEFORE UPDATE OF stage ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.tg_deal_outcome_sync();

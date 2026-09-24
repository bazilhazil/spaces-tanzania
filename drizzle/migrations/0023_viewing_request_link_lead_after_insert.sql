CREATE OR REPLACE FUNCTION public.tg_booking_route_and_notify()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_prop RECORD;
BEGIN
  SELECT id, owner_id INTO v_prop FROM public.properties WHERE id = NEW.property_id;
  IF NEW.owner_id IS NULL THEN NEW.owner_id := v_prop.owner_id; END IF;
  IF NEW.recipient_id IS NULL THEN NEW.recipient_id := COALESCE(NEW.agent_id, NEW.owner_id); END IF;
  IF NEW.status IS NULL OR NEW.status = 'requested' THEN NEW.status := 'pending'; END IF;
  IF NEW.buyer_name IS NULL OR NEW.buyer_email IS NULL THEN
    SELECT COALESCE(NEW.buyer_name, full_name), COALESCE(NEW.buyer_email, email)
      INTO NEW.buyer_name, NEW.buyer_email FROM public.profiles WHERE id = NEW.buyer_id;
  END IF;
  RETURN NEW;
END; $function$;

-- Lead/deal linking + notification moved to AFTER INSERT: creating a lead fires
-- lead/deal triggers that update rows, which Postgres forbids inside a BEFORE trigger.
CREATE OR REPLACE FUNCTION public.tg_booking_attach_lead()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_lead uuid := NEW.lead_id; v_deal uuid := NEW.deal_id; v_title text;
BEGIN
  SELECT title INTO v_title FROM public.properties WHERE id = NEW.property_id;
  IF v_lead IS NULL THEN
    SELECT id INTO v_lead FROM public.leads
      WHERE property_id = NEW.property_id AND visitor_id = NEW.buyer_id AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 1;
    IF v_lead IS NULL THEN
      INSERT INTO public.leads (property_id, owner_id, visitor_id, visitor_name, visitor_phone,
                                visitor_email, contact_method, message, status)
      VALUES (NEW.property_id, NEW.owner_id, NEW.buyer_id, NEW.buyer_name, NEW.contact_phone,
              NEW.buyer_email, 'viewing', COALESCE(NEW.message, 'Viewing requested'), 'new')
      RETURNING id INTO v_lead;
    END IF;
  END IF;
  IF v_deal IS NULL THEN
    SELECT id INTO v_deal FROM public.deals
      WHERE property_id = NEW.property_id AND buyer_id = NEW.buyer_id
      ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF v_lead IS DISTINCT FROM NEW.lead_id OR v_deal IS DISTINCT FROM NEW.deal_id THEN
    UPDATE public.bookings SET lead_id = v_lead, deal_id = v_deal WHERE id = NEW.id;
  END IF;
  IF NEW.recipient_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link, data)
    VALUES (NEW.recipient_id, 'viewing_requested', 'New viewing request',
            COALESCE(NEW.buyer_name, 'A buyer') || ' requested a viewing for ' || COALESCE(v_title,'a property'),
            '/viewings', jsonb_build_object('booking_id', NEW.id, 'property_id', NEW.property_id));
  END IF;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS booking_attach_lead ON public.bookings;
CREATE TRIGGER booking_attach_lead AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.tg_booking_attach_lead();
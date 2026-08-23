-- 1. Shared status vocabulary ------------------------------------------------

CREATE OR REPLACE FUNCTION public.crm_stage_for_lead_status(_status text)
RETURNS public.deal_stage LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE lower(coalesce(_status,'new'))
    WHEN 'new' THEN 'new_inquiry'
    WHEN 'contacted' THEN 'contacted'
    WHEN 'viewing_scheduled' THEN 'viewing_scheduled'
    WHEN 'viewing_completed' THEN 'viewing_completed'
    WHEN 'negotiating' THEN 'negotiation'
    WHEN 'offer_made' THEN 'offer_made'
    WHEN 'won' THEN 'completed'
    WHEN 'lost' THEN 'cancelled'
    ELSE 'new_inquiry' END::public.deal_stage;
$$;

CREATE OR REPLACE FUNCTION public.crm_lead_status_for_stage(_stage public.deal_stage)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _stage
    WHEN 'new_inquiry' THEN 'new'
    WHEN 'contacted' THEN 'contacted'
    WHEN 'viewing_scheduled' THEN 'viewing_scheduled'
    WHEN 'viewing_completed' THEN 'viewing_completed'
    WHEN 'negotiation' THEN 'negotiating'
    WHEN 'offer_made' THEN 'offer_made'
    WHEN 'offer_accepted' THEN 'offer_made'
    WHEN 'agreement_signed' THEN 'offer_made'
    WHEN 'completed' THEN 'won'
    WHEN 'cancelled' THEN 'lost'
    ELSE 'new' END;
$$;

CREATE OR REPLACE FUNCTION public.crm_rank(_status text)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE lower(coalesce(_status,'new'))
    WHEN 'new' THEN 0 WHEN 'new_inquiry' THEN 0
    WHEN 'contacted' THEN 1
    WHEN 'viewing_scheduled' THEN 2
    WHEN 'viewing_completed' THEN 3
    WHEN 'negotiating' THEN 4 WHEN 'negotiation' THEN 4
    WHEN 'offer_made' THEN 5
    WHEN 'offer_accepted' THEN 6
    WHEN 'agreement_signed' THEN 7
    WHEN 'won' THEN 8 WHEN 'completed' THEN 8
    WHEN 'lost' THEN 9 WHEN 'cancelled' THEN 9
    ELSE 0 END;
$$;

-- 2. Every inquiry gets exactly one deal record -------------------------------

CREATE OR REPLACE FUNCTION public.tg_lead_ensure_deal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deal_id uuid;
  v_price numeric;
  v_currency text;
  v_owner uuid;
BEGIN
  IF NEW.deal_id IS NOT NULL THEN RETURN NEW; END IF;

  SELECT id INTO v_deal_id FROM public.deals
   WHERE property_id = NEW.property_id
     AND (buyer_id IS NOT DISTINCT FROM NEW.visitor_id OR lead_id = NEW.id)
   ORDER BY created_at DESC LIMIT 1;

  IF v_deal_id IS NULL THEN
    SELECT owner_id, price, currency INTO v_owner, v_price, v_currency
      FROM public.properties WHERE id = NEW.property_id;
    INSERT INTO public.deals (reference, property_id, lead_id, buyer_id, buyer_name,
                              buyer_phone, buyer_email, owner_id, stage, value, currency)
    VALUES ('DL-' || upper(substr(replace(NEW.id::text,'-',''),1,8)),
            NEW.property_id, NEW.id, NEW.visitor_id, NEW.visitor_name,
            NEW.visitor_phone, NEW.visitor_email, COALESCE(NEW.owner_id, v_owner),
            public.crm_stage_for_lead_status(NEW.status), v_price, COALESCE(v_currency,'TZS'))
    RETURNING id INTO v_deal_id;
  ELSE
    UPDATE public.deals SET lead_id = NEW.id WHERE id = v_deal_id AND lead_id IS NULL;
  END IF;

  UPDATE public.leads SET deal_id = v_deal_id WHERE id = NEW.id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS lead_ensure_deal ON public.leads;
CREATE TRIGGER lead_ensure_deal AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.tg_lead_ensure_deal();

-- 3. Inquiry status change propagates to the pipeline -------------------------

CREATE OR REPLACE FUNCTION public.tg_lead_status_to_deal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_stage public.deal_stage;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.deal_id IS NULL THEN RETURN NEW; END IF;
  v_stage := public.crm_stage_for_lead_status(NEW.status);
  UPDATE public.deals SET stage = v_stage, last_activity_at = now()
   WHERE id = NEW.deal_id AND stage IS DISTINCT FROM v_stage;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS lead_status_to_deal ON public.leads;
CREATE TRIGGER lead_status_to_deal AFTER UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.tg_lead_status_to_deal();

-- 4. A property conversation always creates/reuses one inquiry ----------------

CREATE OR REPLACE FUNCTION public.tg_conversation_ensure_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lead_id uuid;
  v_name text; v_email text; v_phone text;
BEGIN
  IF NEW.property_id IS NULL OR NEW.buyer_id IS NULL THEN RETURN NEW; END IF;
  SELECT id INTO v_lead_id FROM public.leads
    WHERE property_id = NEW.property_id AND visitor_id = NEW.buyer_id
    ORDER BY created_at DESC LIMIT 1;
  IF v_lead_id IS NOT NULL THEN RETURN NEW; END IF;

  SELECT full_name, email, phone INTO v_name, v_email, v_phone
    FROM public.profiles WHERE id = NEW.buyer_id;

  INSERT INTO public.leads (property_id, owner_id, visitor_id, visitor_name, visitor_phone,
                            visitor_email, contact_method, message, status)
  VALUES (NEW.property_id, NEW.owner_id, NEW.buyer_id, v_name, v_phone, v_email,
          'message', 'Started a conversation about this property', 'new');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS conversation_ensure_lead ON public.conversations;
CREATE TRIGGER conversation_ensure_lead AFTER INSERT ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.tg_conversation_ensure_lead();

-- 5. Owner/agent first reply => Contacted -------------------------------------

CREATE OR REPLACE FUNCTION public.tg_message_advance_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c RECORD; v_lead_id uuid;
BEGIN
  SELECT * INTO c FROM public.conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND OR c.property_id IS NULL THEN RETURN NEW; END IF;

  SELECT id INTO v_lead_id FROM public.leads
    WHERE property_id = c.property_id AND visitor_id = c.buyer_id
    ORDER BY created_at DESC LIMIT 1;

  IF NEW.sender_id = c.buyer_id THEN
    IF v_lead_id IS NOT NULL THEN
      UPDATE public.leads SET last_activity_at = now() WHERE id = v_lead_id;
    END IF;
    RETURN NEW;
  END IF;

  -- responder is the owner/agent side
  IF v_lead_id IS NOT NULL THEN
    UPDATE public.leads SET status = 'contacted', last_activity_at = now()
     WHERE id = v_lead_id AND status = 'new';
  END IF;
  UPDATE public.deals SET stage = 'contacted', last_activity_at = now()
   WHERE conversation_id = NEW.conversation_id AND stage = 'new_inquiry';
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS message_advance_status ON public.messages;
CREATE TRIGGER message_advance_status AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.tg_message_advance_status();

-- 6. Backfill: link and re-sync existing records ------------------------------

UPDATE public.deals d SET lead_id = l.id
  FROM public.leads l
 WHERE d.lead_id IS NULL AND l.deal_id IS NULL
   AND d.property_id = l.property_id AND d.buyer_id IS NOT DISTINCT FROM l.visitor_id;

UPDATE public.leads l SET deal_id = d.id
  FROM public.deals d
 WHERE l.deal_id IS NULL AND d.lead_id = l.id;

-- align both sides to the furthest-progressed status
UPDATE public.deals d
   SET stage = public.crm_stage_for_lead_status(l.status), last_activity_at = now()
  FROM public.leads l
 WHERE l.deal_id = d.id
   AND public.crm_rank(l.status) > public.crm_rank(d.stage::text);

UPDATE public.leads l
   SET status = public.crm_lead_status_for_stage(d.stage), last_activity_at = now()
  FROM public.deals d
 WHERE l.deal_id = d.id
   AND public.crm_rank(d.stage::text) > public.crm_rank(l.status);
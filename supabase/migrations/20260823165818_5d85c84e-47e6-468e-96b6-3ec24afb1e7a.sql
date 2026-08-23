ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS leads_conversation_id_idx ON public.leads(conversation_id);

UPDATE public.leads l
SET conversation_id = c.id
FROM public.conversations c
WHERE l.conversation_id IS NULL
  AND c.property_id = l.property_id
  AND c.buyer_id = l.visitor_id;

CREATE OR REPLACE FUNCTION public.tg_conversation_ensure_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead_id uuid;
  v_name text; v_email text; v_phone text;
BEGIN
  IF NEW.property_id IS NULL OR NEW.buyer_id IS NULL THEN RETURN NEW; END IF;
  SELECT id INTO v_lead_id FROM public.leads
    WHERE property_id = NEW.property_id AND visitor_id = NEW.buyer_id
    ORDER BY created_at DESC LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    UPDATE public.leads SET conversation_id = NEW.id
      WHERE id = v_lead_id AND conversation_id IS NULL;
    RETURN NEW;
  END IF;

  SELECT full_name, email, phone INTO v_name, v_email, v_phone
    FROM public.profiles WHERE id = NEW.buyer_id;

  INSERT INTO public.leads (property_id, owner_id, visitor_id, visitor_name, visitor_phone,
                            visitor_email, contact_method, message, status, conversation_id)
  VALUES (NEW.property_id, NEW.owner_id, NEW.buyer_id, v_name, v_phone, v_email,
          'message', 'Started a conversation about this property', 'new', NEW.id);
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.tg_message_advance_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE c RECORD; v_lead_id uuid;
BEGIN
  SELECT * INTO c FROM public.conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT id INTO v_lead_id FROM public.leads
    WHERE conversation_id = c.id
    ORDER BY created_at DESC LIMIT 1;

  IF v_lead_id IS NULL AND c.property_id IS NOT NULL THEN
    SELECT id INTO v_lead_id FROM public.leads
      WHERE property_id = c.property_id AND visitor_id = c.buyer_id
      ORDER BY created_at DESC LIMIT 1;
    IF v_lead_id IS NOT NULL THEN
      UPDATE public.leads SET conversation_id = c.id
        WHERE id = v_lead_id AND conversation_id IS NULL;
    END IF;
  END IF;

  -- Buyer messages only touch activity, never the status.
  IF NEW.sender_id = c.buyer_id THEN
    IF v_lead_id IS NOT NULL THEN
      UPDATE public.leads SET last_activity_at = now() WHERE id = v_lead_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Only the responsible owner/agent side can advance New -> Contacted.
  IF v_lead_id IS NOT NULL THEN
    UPDATE public.leads SET status = 'contacted', last_activity_at = now()
     WHERE id = v_lead_id AND status = 'new';
  END IF;
  UPDATE public.deals SET stage = 'contacted', last_activity_at = now()
   WHERE conversation_id = NEW.conversation_id AND stage = 'new_inquiry';
  RETURN NEW;
END; $function$;
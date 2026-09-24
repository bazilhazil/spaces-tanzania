CREATE OR REPLACE FUNCTION public.tg_lead_ensure_deal()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_deal_id uuid; v_price numeric; v_currency text; v_owner uuid;
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
  -- deal_created_link may already have linked this lead; don't touch the row twice.
  UPDATE public.leads SET deal_id = v_deal_id
   WHERE id = NEW.id AND deal_id IS DISTINCT FROM v_deal_id;
  RETURN NEW;
END; $function$;
-- BEFORE part: only mutate the deal row itself.
CREATE OR REPLACE FUNCTION public.tg_deal_outcome_sync()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage AND NEW.stage = 'completed' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  END IF;
  RETURN NEW;
END; $function$;

-- AFTER part: push the stage to the linked lead without bouncing back to the deal.
CREATE OR REPLACE FUNCTION public.tg_deal_outcome_sync_lead()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.stage IS NOT DISTINCT FROM OLD.stage OR NEW.lead_id IS NULL THEN RETURN NEW; END IF;
  PERFORM set_config('spaces.deal_sync', '1', true);
  IF NEW.stage = 'completed' THEN
    PERFORM public.set_lead_status(NEW.lead_id, 'won', true);
  ELSIF NEW.stage = 'cancelled' THEN
    PERFORM public.set_lead_status(NEW.lead_id, 'lost', true);
  ELSE
    PERFORM public.set_lead_status(NEW.lead_id,
      CASE NEW.stage
        WHEN 'contacted' THEN 'contacted'
        WHEN 'viewing_scheduled' THEN 'viewing_scheduled'
        WHEN 'viewing_completed' THEN 'viewing_completed'
        WHEN 'negotiation' THEN 'negotiating'
        WHEN 'offer_made' THEN 'offer_made'
        WHEN 'offer_accepted' THEN 'offer_made'
        WHEN 'agreement_signed' THEN 'offer_made'
        ELSE 'new' END);
  END IF;
  PERFORM set_config('spaces.deal_sync', '', true);
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS deal_outcome_sync_lead ON public.deals;
CREATE TRIGGER deal_outcome_sync_lead AFTER UPDATE OF stage ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.tg_deal_outcome_sync_lead();

CREATE OR REPLACE FUNCTION public.tg_lead_status_to_deal()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_stage public.deal_stage;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.deal_id IS NULL THEN RETURN NEW; END IF;
  IF current_setting('spaces.deal_sync', true) = '1' THEN RETURN NEW; END IF;
  v_stage := public.crm_stage_for_lead_status(NEW.status);
  UPDATE public.deals SET stage = v_stage, last_activity_at = now()
   WHERE id = NEW.deal_id AND stage IS DISTINCT FROM v_stage;
  RETURN NEW;
END; $function$;
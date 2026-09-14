-- Lead follow-up & response management (additive only)

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS first_responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS lost_reason text;

-- Stamp the first owner/agent response (New -> anything else).
CREATE OR REPLACE FUNCTION public.tg_lead_response_stamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.first_responded_at IS NULL
     AND lower(coalesce(OLD.status,'new')) = 'new'
     AND lower(coalesce(NEW.status,'new')) <> 'new' THEN
    NEW.first_responded_at := now();
  END IF;
  IF lower(coalesce(NEW.status,'new')) <> 'lost' THEN
    NEW.lost_reason := NULL;
  END IF;
  RETURN NEW;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.tg_lead_response_stamp() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS lead_response_stamp ON public.leads;
CREATE TRIGGER lead_response_stamp
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_lead_response_stamp();

-- Standardised statuses: add 'interested' and 'closed' to the existing mappings.
CREATE OR REPLACE FUNCTION public.crm_stage_for_lead_status(_status text)
RETURNS deal_stage
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE lower(coalesce(_status,'new'))
    WHEN 'new' THEN 'new_inquiry'
    WHEN 'contacted' THEN 'contacted'
    WHEN 'interested' THEN 'contacted'
    WHEN 'viewing_scheduled' THEN 'viewing_scheduled'
    WHEN 'viewing_completed' THEN 'viewing_completed'
    WHEN 'negotiating' THEN 'negotiation'
    WHEN 'offer_made' THEN 'offer_made'
    WHEN 'won' THEN 'completed'
    WHEN 'lost' THEN 'cancelled'
    WHEN 'closed' THEN 'cancelled'
    ELSE 'new_inquiry' END::public.deal_stage;
$function$;

CREATE OR REPLACE FUNCTION public.crm_rank(_status text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE lower(coalesce(_status,'new'))
    WHEN 'new' THEN 0 WHEN 'new_inquiry' THEN 0
    WHEN 'contacted' THEN 10
    WHEN 'interested' THEN 20
    WHEN 'viewing_scheduled' THEN 30
    WHEN 'viewing_completed' THEN 40
    WHEN 'negotiating' THEN 50 WHEN 'negotiation' THEN 50
    WHEN 'offer_made' THEN 60
    WHEN 'offer_accepted' THEN 70
    WHEN 'agreement_signed' THEN 80
    WHEN 'won' THEN 90 WHEN 'completed' THEN 90
    WHEN 'lost' THEN 100 WHEN 'cancelled' THEN 100
    WHEN 'closed' THEN 100
    ELSE 0 END;
$function$;

-- Terminal statuses are never overwritten by automatic syncing.
CREATE OR REPLACE FUNCTION public.set_lead_status(_lead_id uuid, _status text, _force boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _lead_id IS NULL THEN RETURN; END IF;
  UPDATE public.leads
    SET status = CASE WHEN _force OR status NOT IN ('won','lost','closed') THEN _status ELSE status END,
        last_activity_at = now()
    WHERE id = _lead_id;
END; $function$;
CREATE OR REPLACE FUNCTION private.tg_deal_auto_agent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _agent uuid;
BEGIN
  IF NEW.agent_id IS NULL AND NEW.property_id IS NOT NULL THEN
    SELECT pa.agent_id INTO _agent
    FROM public.property_agents pa
    WHERE pa.property_id = NEW.property_id
      AND pa.permission >= 'manage_leads'::public.agent_permission
      AND pa.agent_id IS DISTINCT FROM NEW.buyer_id
      AND pa.agent_id IS DISTINCT FROM NEW.owner_id
    ORDER BY pa.permission DESC, pa.created_at ASC
    LIMIT 1;
    IF _agent IS NOT NULL THEN NEW.agent_id := _agent; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.tg_deal_auto_agent() FROM PUBLIC;
DROP TRIGGER IF EXISTS deal_auto_agent ON public.deals;
CREATE TRIGGER deal_auto_agent BEFORE INSERT ON public.deals
FOR EACH ROW EXECUTE FUNCTION private.tg_deal_auto_agent();
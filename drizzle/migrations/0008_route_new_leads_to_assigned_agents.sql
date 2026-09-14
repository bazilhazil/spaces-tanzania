CREATE OR REPLACE FUNCTION public.tg_lead_created_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_agent uuid;
BEGIN
  SELECT title INTO v_title FROM public.properties WHERE id = NEW.property_id;

  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link, data)
    VALUES (NEW.owner_id, 'lead_created', 'New lead',
            COALESCE(NEW.visitor_name,'Someone') || ' inquired about ' || COALESCE(v_title,'a property'),
            '/leads', jsonb_build_object('lead_id', NEW.id, 'property_id', NEW.property_id));
  END IF;

  -- Agents authorised to handle inquiries on this listing are notified too.
  FOR v_agent IN
    SELECT pa.agent_id FROM public.property_agents pa
    WHERE pa.property_id = NEW.property_id
      AND pa.permission IN ('manage_leads', 'full_management')
      AND pa.agent_id IS DISTINCT FROM NEW.owner_id
  LOOP
    INSERT INTO public.notifications (user_id, kind, title, body, link, data)
    VALUES (v_agent, 'lead_created', 'New lead',
            COALESCE(NEW.visitor_name,'Someone') || ' inquired about ' || COALESCE(v_title,'a property'),
            '/leads', jsonb_build_object('lead_id', NEW.id, 'property_id', NEW.property_id));
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tg_lead_created_notify() FROM PUBLIC, anon, authenticated;
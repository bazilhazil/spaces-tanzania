CREATE OR REPLACE FUNCTION public.tg_agent_approval_grant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.subject_type = 'agent' AND NEW.status = 'approved'
     AND OLD.status IS DISTINCT FROM 'approved' THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (NEW.requester_id, 'agent'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_agent_approval_grant ON public.verification_requests;
CREATE TRIGGER trg_agent_approval_grant
AFTER UPDATE OF status ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_agent_approval_grant();
-- 1. Deals: restrict agent self-assignment
DROP POLICY IF EXISTS "Deals insert by participants" ON public.deals;
CREATE POLICY "Deals insert by participants"
ON public.deals FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR (
    ((owner_id = auth.uid()) OR (agent_id = auth.uid()) OR (buyer_id = auth.uid()))
    AND (buyer_id IS NULL OR agent_id IS NULL OR buyer_id <> agent_id)
    AND (
      agent_id IS NULL
      OR (owner_id IS NOT NULL AND agent_id = owner_id)
      OR (property_id IS NOT NULL AND (
            private.is_property_agent(property_id, agent_id)
            OR private.is_property_owner(property_id, agent_id)
          ))
    )
    AND ((property_id IS NULL) OR ((owner_id IS NULL) OR private.is_property_owner(property_id, owner_id)))
    AND ((conversation_id IS NULL) OR (EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = deals.conversation_id
        AND (c.buyer_id = auth.uid() OR c.owner_id = auth.uid())
        AND (deals.buyer_id IS NULL OR deals.buyer_id = c.buyer_id)
        AND (deals.property_id IS NULL OR c.property_id IS NULL OR deals.property_id = c.property_id)
    )))
  )
);

-- 2. Leads: validate visitor contact data and force real owner
CREATE OR REPLACE FUNCTION public.tg_guard_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  real_owner uuid;
BEGIN
  IF NEW.visitor_id IS NOT NULL THEN
    IF private.is_restricted(NEW.visitor_id) THEN RAISE EXCEPTION 'ACCOUNT_RESTRICTED'; END IF;
    IF NEW.owner_id IS NOT NULL AND private.is_blocked_between(NEW.visitor_id, NEW.owner_id) THEN
      RAISE EXCEPTION 'USER_BLOCKED';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- owner_id always derived from the property, never trusted from the client
    SELECT p.owner_id INTO real_owner FROM public.properties p WHERE p.id = NEW.property_id;
    IF real_owner IS NULL THEN RAISE EXCEPTION 'INVALID_PROPERTY'; END IF;
    NEW.owner_id := real_owner;
  END IF;

  -- normalise + validate client supplied contact details
  NEW.visitor_name := NULLIF(btrim(left(coalesce(NEW.visitor_name, ''), 120)), '');
  NEW.visitor_email := NULLIF(btrim(lower(left(coalesce(NEW.visitor_email, ''), 200))), '');
  NEW.visitor_phone := NULLIF(btrim(left(coalesce(NEW.visitor_phone, ''), 32)), '');
  NEW.message := NULLIF(btrim(left(coalesce(NEW.message, ''), 2000)), '');

  IF NEW.visitor_email IS NOT NULL AND NEW.visitor_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' THEN
    RAISE EXCEPTION 'INVALID_EMAIL';
  END IF;
  IF NEW.visitor_phone IS NOT NULL AND NEW.visitor_phone !~ '^\+?[0-9 ()-]{7,20}$' THEN
    RAISE EXCEPTION 'INVALID_PHONE';
  END IF;

  RETURN NEW;
END
$$;

-- 3. Review reports: reporters may withdraw pending reports
CREATE POLICY "Reporters withdraw pending reports"
ON public.review_reports FOR DELETE TO authenticated
USING (
  (reporter_id = auth.uid() AND status = 'pending')
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);
GRANT DELETE ON public.review_reports TO authenticated;
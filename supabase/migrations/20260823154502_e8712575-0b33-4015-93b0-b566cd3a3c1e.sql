CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_property_owner(_property_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.properties p WHERE p.id = _property_id AND p.owner_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION private.is_property_agent(_property_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.property_agents a WHERE a.property_id = _property_id AND a.agent_id = _user_id);
$$;

REVOKE ALL ON FUNCTION private.is_property_owner(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_property_agent(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_property_owner(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_property_agent(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "buyer creates booking" ON public.bookings;
CREATE POLICY "buyer creates booking"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = buyer_id
  AND private.is_property_owner(property_id, owner_id)
  AND (agent_id IS NULL OR private.is_property_agent(property_id, agent_id))
  AND (recipient_id IS NULL OR recipient_id = owner_id OR recipient_id = agent_id)
);

DROP POLICY IF EXISTS "Deals insert by participants" ON public.deals;
CREATE POLICY "Deals insert by participants"
ON public.deals FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    (owner_id = auth.uid() OR agent_id = auth.uid() OR buyer_id = auth.uid())
    AND (
      property_id IS NULL
      OR (
        (owner_id IS NULL OR private.is_property_owner(property_id, owner_id))
        AND (
          agent_id IS NULL
          OR private.is_property_agent(property_id, agent_id)
          OR private.is_property_owner(property_id, agent_id)
        )
      )
    )
    AND (
      conversation_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id
          AND (buyer_id IS NULL OR c.buyer_id = buyer_id)
          AND (owner_id IS NULL OR c.owner_id = owner_id)
      )
    )
  )
);

DROP FUNCTION IF EXISTS public.is_property_owner(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_property_agent(uuid, uuid);
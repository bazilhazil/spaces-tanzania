-- property_agents policies do not reference properties, so no recursion risk:
-- run the permission lookup as the caller instead of as definer.
CREATE OR REPLACE FUNCTION public.agent_permission_for(_property_id uuid, _agent_id uuid)
RETURNS public.agent_permission
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT permission FROM public.property_agents
  WHERE property_id = _property_id AND agent_id = _agent_id
  LIMIT 1;
$$;
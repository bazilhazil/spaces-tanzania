-- 1) has_role: only allow a signed-in caller to check their own roles, or admins to check anyone's.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  -- Trusted server-side contexts (service role / no JWT) keep full behaviour.
  IF _caller IS NOT NULL AND _user_id IS DISTINCT FROM _caller THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _caller AND role IN ('admin','super_admin')
    ) THEN
      RETURN false;
    END IF;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

-- 2) agent_permission_for: scope lookups to the caller (assigned agent) or the property owner/admin.
CREATE OR REPLACE FUNCTION public.agent_permission_for(_property_id uuid, _agent_id uuid)
RETURNS agent_permission
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
  _perm public.agent_permission;
BEGIN
  IF _caller IS NOT NULL
     AND _agent_id IS DISTINCT FROM _caller
     AND NOT EXISTS (
       SELECT 1 FROM public.properties p
       WHERE p.id = _property_id AND p.owner_id = _caller
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = _caller AND ur.role IN ('admin','super_admin')
     )
  THEN
    RETURN NULL;
  END IF;

  SELECT pa.permission INTO _perm
  FROM public.property_agents pa
  WHERE pa.property_id = _property_id AND pa.agent_id = _agent_id
  LIMIT 1;

  RETURN _perm;
END;
$function$;

REVOKE ALL ON FUNCTION public.agent_permission_for(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agent_permission_for(uuid, uuid) TO authenticated, service_role;
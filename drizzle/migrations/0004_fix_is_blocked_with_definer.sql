CREATE OR REPLACE FUNCTION public.is_blocked_with(_other uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
  SELECT private.is_blocked_between(auth.uid(), _other);
$function$;

REVOKE EXECUTE ON FUNCTION public.is_blocked_with(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_blocked_with(uuid) TO authenticated;
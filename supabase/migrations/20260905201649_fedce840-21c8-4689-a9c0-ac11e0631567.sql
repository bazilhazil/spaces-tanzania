CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$;

DROP POLICY IF EXISTS "Authenticated visitors can create leads" ON public.leads;
CREATE POLICY "Authenticated visitors can create leads"
ON public.leads FOR INSERT TO authenticated
WITH CHECK (
  visitor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = leads.property_id AND p.owner_id = leads.owner_id
  )
);
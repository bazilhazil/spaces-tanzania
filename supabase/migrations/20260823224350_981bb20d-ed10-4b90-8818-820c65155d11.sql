-- 1. Property media: anon sees only live listings' media rows (matches storage.objects policy)
DROP POLICY IF EXISTS "Public can view media of listed properties" ON public.property_media;

CREATE POLICY "Anon views media of live properties"
ON public.property_media
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_media.property_id
      AND p.status = 'live'::property_status
  )
);

CREATE POLICY "Authenticated views media of listed properties"
ON public.property_media
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_media.property_id
      AND (
        p.status = ANY (ARRAY['live'::property_status, 'sold'::property_status, 'rented'::property_status])
        OR p.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

-- 2. Hard guard against role self-escalation: enforce buyer-only self insert at row level.
DROP POLICY IF EXISTS "users self-insert buyer role" ON public.user_roles;

CREATE POLICY "users self-insert buyer role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'buyer'::app_role
);

CREATE OR REPLACE FUNCTION public.tg_user_roles_guard_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins and service-side calls (no JWT) may assign anything.
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Everyone else may only ever grant themselves the plain buyer role.
  IF NEW.user_id <> auth.uid() OR NEW.role <> 'buyer'::app_role THEN
    RAISE EXCEPTION 'Not allowed to assign role % ', NEW.role
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_guard_escalation ON public.user_roles;
CREATE TRIGGER user_roles_guard_escalation
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.tg_user_roles_guard_escalation();
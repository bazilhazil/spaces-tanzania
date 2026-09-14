-- Only admins may move a listing to a different owner.
CREATE OR REPLACE FUNCTION public.tg_property_owner_change_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'OWNER_CHANGE_NOT_ALLOWED';
  END IF;
  RETURN NEW;
END
$$;

REVOKE EXECUTE ON FUNCTION public.tg_property_owner_change_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS property_owner_change_guard ON public.properties;
CREATE TRIGGER property_owner_change_guard
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.tg_property_owner_change_guard();

-- Admins can manage agent assignments on any listing.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_agents TO authenticated;
GRANT ALL ON public.property_agents TO service_role;

DROP POLICY IF EXISTS "Admins manage property agents" ON public.property_agents;
CREATE POLICY "Admins manage property agents" ON public.property_agents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
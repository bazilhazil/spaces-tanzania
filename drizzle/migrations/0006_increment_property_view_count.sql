CREATE OR REPLACE FUNCTION public.tg_property_view_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.properties
     SET view_count = COALESCE(view_count, 0) + 1
   WHERE id = NEW.property_id;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tg_property_view_count() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_property_view_count ON public.property_views;
CREATE TRIGGER trg_property_view_count
AFTER INSERT ON public.property_views
FOR EACH ROW EXECUTE FUNCTION public.tg_property_view_count();
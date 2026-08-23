-- 1. Saved searches
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  alerts_enabled boolean NOT NULL DEFAULT true,
  frequency text NOT NULL DEFAULT 'instant',
  last_alert_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS saved_searches_user_name_key
  ON public.saved_searches (user_id, lower(name));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO authenticated;
GRANT ALL ON public.saved_searches TO service_role;

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own saved searches select" ON public.saved_searches;
CREATE POLICY "own saved searches select" ON public.saved_searches
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own saved searches insert" ON public.saved_searches;
CREATE POLICY "own saved searches insert" ON public.saved_searches
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own saved searches update" ON public.saved_searches;
CREATE POLICY "own saved searches update" ON public.saved_searches
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own saved searches delete" ON public.saved_searches;
CREATE POLICY "own saved searches delete" ON public.saved_searches
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS saved_searches_touch ON public.saved_searches;
CREATE TRIGGER saved_searches_touch BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 2. Duplicate protection on favorites
CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_property_key
  ON public.favorites (user_id, property_id);

-- 3. Alerts on saved properties (price / availability / verification)
CREATE OR REPLACE FUNCTION public.tg_property_favorite_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _kind text;
  _title text;
  _body text;
  _data jsonb;
BEGIN
  IF NEW.price IS DISTINCT FROM OLD.price AND NEW.price IS NOT NULL AND OLD.price IS NOT NULL THEN
    _kind := 'price_change';
    _title := 'Price changed on a saved space';
    _body := NEW.title;
    _data := jsonb_build_object(
      'property_id', NEW.id,
      'previous_price', OLD.price,
      'new_price', NEW.price,
      'currency', NEW.currency
    );
  ELSIF NEW.verified = true AND COALESCE(OLD.verified, false) = false THEN
    _kind := 'property_verified';
    _title := 'A saved space is now verified';
    _body := NEW.title;
    _data := jsonb_build_object('property_id', NEW.id);
  ELSIF NEW.status = 'live' AND OLD.status IS DISTINCT FROM 'live' THEN
    _kind := 'property_available';
    _title := 'A saved space is available again';
    _body := NEW.title;
    _data := jsonb_build_object('property_id', NEW.id);
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, kind, title, body, link, data)
  SELECT f.user_id, _kind, _title, _body, '/property/' || NEW.id::text, _data
  FROM public.favorites f
  WHERE f.property_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS property_favorite_alerts ON public.properties;
CREATE TRIGGER property_favorite_alerts AFTER UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.tg_property_favorite_alerts();

-- 4. Saved-search match alerts
CREATE OR REPLACE FUNCTION public.saved_search_matches(_filters jsonb, _p public.properties)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  _amenities text;
BEGIN
  IF COALESCE(_filters->>'type','') <> '' AND _p.listing_type::text <> (_filters->>'type') THEN RETURN false; END IF;
  IF COALESCE(_filters->>'category','') <> '' AND lower(_p.property_type::text) <> lower(_filters->>'category') THEN RETURN false; END IF;
  IF COALESCE(_filters->>'city','') <> '' AND COALESCE(_p.region,'') <> (_filters->>'city') THEN RETURN false; END IF;
  IF COALESCE(_filters->>'district','') <> '' AND COALESCE(_p.district,'') <> (_filters->>'district') THEN RETURN false; END IF;
  IF COALESCE(_filters->>'area','') <> '' AND COALESCE(_p.ward,'') <> (_filters->>'area') THEN RETURN false; END IF;
  IF COALESCE(_filters->>'minPrice','') <> '' AND _p.price < (_filters->>'minPrice')::numeric THEN RETURN false; END IF;
  IF COALESCE(_filters->>'maxPrice','') <> '' AND _p.price > (_filters->>'maxPrice')::numeric THEN RETURN false; END IF;
  IF COALESCE(_filters->>'beds','') <> '' AND COALESCE(_p.bedrooms,0) < (_filters->>'beds')::int THEN RETURN false; END IF;
  IF COALESCE(_filters->>'baths','') <> '' AND COALESCE(_p.bathrooms,0) < (_filters->>'baths')::int THEN RETURN false; END IF;
  IF COALESCE(_filters->>'verified','') = 'true' AND COALESCE(_p.verified,false) = false THEN RETURN false; END IF;
  IF COALESCE(_filters->>'furnished','') = 'true' AND NOT ('furnished' = ANY(_p.amenities)) THEN RETURN false; END IF;
  _amenities := COALESCE(_filters->>'amenities','');
  IF _amenities <> '' THEN
    IF NOT (string_to_array(_amenities, ',') <@ _p.amenities) THEN RETURN false; END IF;
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_saved_search_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'live' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'live' THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, kind, title, body, link, data)
  SELECT s.user_id,
         'saved_search_match',
         'New space matching your saved search',
         NEW.title,
         '/property/' || NEW.id::text,
         jsonb_build_object('property_id', NEW.id, 'saved_search_id', s.id, 'saved_search_name', s.name)
  FROM public.saved_searches s
  WHERE s.alerts_enabled = true
    AND s.frequency <> 'off'
    AND s.user_id <> NEW.owner_id
    AND public.saved_search_matches(s.filters, NEW);

  UPDATE public.saved_searches s
  SET last_alert_at = now()
  WHERE s.alerts_enabled = true
    AND s.frequency <> 'off'
    AND s.user_id <> NEW.owner_id
    AND public.saved_search_matches(s.filters, NEW);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS saved_search_alerts ON public.properties;
CREATE TRIGGER saved_search_alerts AFTER INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.tg_saved_search_alerts();
-- ISSUE 2: public read policies must not call has_role (anon has no EXECUTE on it)
DROP POLICY IF EXISTS "published faqs readable" ON public.support_faqs;
CREATE POLICY "Public reads published faqs" ON public.support_faqs
  FOR SELECT TO anon USING (published);
CREATE POLICY "Members read faqs" ON public.support_faqs
  FOR SELECT TO authenticated
  USING (published OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Anyone can read active plans" ON public.billing_plans;
CREATE POLICY "Public reads active plans" ON public.billing_plans
  FOR SELECT TO anon USING (active);
CREATE POLICY "Members read plans" ON public.billing_plans
  FOR SELECT TO authenticated
  USING (active OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Anyone can read active promotion products" ON public.promotion_products;
CREATE POLICY "Public reads active promotion products" ON public.promotion_products
  FOR SELECT TO anon USING (active);
CREATE POLICY "Members read promotion products" ON public.promotion_products
  FOR SELECT TO authenticated
  USING (active OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

-- ISSUE 1: publishing queues a real verification request
CREATE OR REPLACE FUNCTION private.queue_property_verification(_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_owner uuid;
BEGIN
  SELECT owner_id INTO v_owner FROM public.properties WHERE id = _property_id;
  IF v_owner IS NULL THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM public.verification_requests
     WHERE property_id = _property_id
       AND subject_type = 'property'
       AND status IN ('pending','under_review','more_info','approved')
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.verification_requests
    (requester_id, subject_type, property_id, documents, details, notes, status)
  VALUES (v_owner, 'property', _property_id, '[]'::jsonb, '{}'::jsonb,
          'Queued automatically when the owner published this listing.', 'pending');
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_property(_property_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.properties;
  miss text[];
BEGIN
  SELECT * INTO p FROM public.properties WHERE id = _property_id;
  IF p.id IS NULL THEN RAISE EXCEPTION 'PROPERTY_NOT_FOUND'; END IF;

  IF NOT (p.owner_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'super_admin')
          OR private.agent_permission_for(p.id, auth.uid()) IN ('edit_listing','full_management')) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF p.under_review THEN
    RETURN jsonb_build_object('published', false, 'paused', true, 'missing', '[]'::jsonb);
  END IF;

  miss := private.listing_missing(p);
  IF array_length(miss, 1) IS NOT NULL THEN
    RETURN jsonb_build_object('published', false, 'paused', false, 'missing', to_jsonb(miss));
  END IF;

  UPDATE public.properties SET status = 'live', updated_at = now() WHERE id = _property_id;
  PERFORM private.queue_property_verification(_property_id);
  RETURN jsonb_build_object('published', true, 'paused', false, 'missing', '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_property_verification_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE next_state text;
BEGIN
  IF NEW.subject_type <> 'property' OR NEW.property_id IS NULL THEN RETURN NEW; END IF;

  next_state := CASE NEW.status
    WHEN 'approved'  THEN 'verified'
    WHEN 'rejected'  THEN 'issue'
    WHEN 'expired'   THEN 'issue'
    WHEN 'revoked'   THEN 'issue'
    WHEN 'more_info' THEN 'more_info'
    ELSE 'in_progress' END;

  PERFORM set_config('spaces.sync', '1', true);
  UPDATE public.properties SET verification_status = next_state WHERE id = NEW.property_id;
  PERFORM set_config('spaces.sync', '0', true);
  RETURN NEW;
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT id FROM public.properties
     WHERE deleted_at IS NULL
       AND status IN ('live','sold','rented')
  LOOP
    PERFORM private.queue_property_verification(r.id);
  END LOOP;
END $$;

CREATE OR REPLACE VIEW public.public_listing_pages AS
SELECT id, owner_id, property_type, listing_type, title, description, price, currency,
       negotiable, bedrooms, bathrooms, parking, parking_available, area_sqm, region,
       district, ward, street, address, latitude, longitude, amenities, status,
       view_count, floor, year_built, landmark, verified, featured, created_at,
       updated_at, verification_status
  FROM properties
 WHERE status = ANY (ARRAY['live'::property_status, 'sold'::property_status, 'rented'::property_status]);

-- ISSUE 5: one genuine visit = one recorded view
CREATE INDEX IF NOT EXISTS property_views_recent_idx
  ON public.property_views (property_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.tg_property_view_dedupe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.property_views v
     WHERE v.property_id = NEW.property_id
       AND v.created_at > now() - interval '30 minutes'
       AND (
         (NEW.viewer_id IS NOT NULL AND v.viewer_id = NEW.viewer_id)
         OR (NEW.session_id IS NOT NULL AND v.session_id = NEW.session_id)
       )
  ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS property_views_dedupe ON public.property_views;
CREATE TRIGGER property_views_dedupe
  BEFORE INSERT ON public.property_views
  FOR EACH ROW EXECUTE FUNCTION public.tg_property_view_dedupe();
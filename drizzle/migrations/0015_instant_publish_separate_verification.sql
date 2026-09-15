-- 1. Separate verification state from the public listing status
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'not_submitted';

ALTER TABLE public.properties
  ADD CONSTRAINT properties_verification_status_check
  CHECK (verification_status IN ('not_submitted','in_progress','verified','issue')) NOT VALID;

UPDATE public.properties SET verification_status = 'verified' WHERE verified = true;

UPDATE public.properties p SET verification_status = 'in_progress'
WHERE p.verified = false
  AND EXISTS (SELECT 1 FROM public.verification_requests r
              WHERE r.property_id = p.id AND r.status IN ('pending','under_review','more_info'));

UPDATE public.properties p SET verification_status = 'issue'
WHERE p.verified = false
  AND p.verification_status = 'not_submitted'
  AND EXISTS (SELECT 1 FROM public.verification_requests r
              WHERE r.property_id = p.id AND r.status IN ('rejected','expired','revoked'));

ALTER TABLE public.properties VALIDATE CONSTRAINT properties_verification_status_check;

-- 2. Automated minimum requirements for instant publication
CREATE OR REPLACE FUNCTION private.listing_missing(_p public.properties)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public','private'
AS $$
DECLARE
  m text[] := '{}';
  photos int := 0;
  c public.property_contacts;
  ok_account boolean;
BEGIN
  IF coalesce(trim(_p.title), '') = '' THEN m := m || 'A title for the space'::text; END IF;
  IF _p.property_type IS NULL THEN m := m || 'The type of space'::text; END IF;
  IF coalesce(_p.price, 0) <= 0 THEN m := m || 'The rent or sale price'::text; END IF;
  IF coalesce(trim(_p.region), '') = '' OR coalesce(trim(_p.district), '') = '' THEN
    m := m || 'The location (region and district)'::text;
  END IF;
  IF length(coalesce(trim(_p.description), '')) < 40 THEN
    m := m || 'A short description (at least 40 characters)'::text;
  END IF;

  SELECT count(*) INTO photos FROM public.property_media
   WHERE property_id = _p.id AND media_type = 'image';
  IF photos < 3 THEN
    m := m || ('At least 3 photos (you have ' || photos || ')')::text;
  END IF;

  SELECT * INTO c FROM public.property_contacts WHERE property_id = _p.id;
  IF c.property_id IS NULL OR coalesce(trim(c.contact_name), '') = '' THEN
    m := m || 'Your name'::text;
  END IF;
  IF c.property_id IS NULL OR coalesce(trim(c.contact_phone), '') = '' THEN
    m := m || 'A phone number people can reach you on'::text;
  END IF;

  SELECT (u.email_confirmed_at IS NOT NULL OR u.phone_confirmed_at IS NOT NULL)
    INTO ok_account FROM auth.users u WHERE u.id = _p.owner_id;
  IF NOT coalesce(ok_account, false) THEN
    m := m || 'A confirmed phone number or email address on your account'::text;
  END IF;

  RETURN m;
END $$;

REVOKE ALL ON FUNCTION private.listing_missing(public.properties) FROM public, anon, authenticated;

-- 3. Listing status guard: instant publish when requirements pass, never otherwise
CREATE OR REPLACE FUNCTION public.tg_property_submit_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','private'
AS $$
DECLARE
  is_admin boolean := public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin');
  syncing boolean := coalesce(current_setting('spaces.sync', true), '') = '1';
BEGIN
  IF is_admin OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- A new listing always starts private; it goes live only once the
    -- automated requirements (photos included) are satisfied.
    IF NEW.status NOT IN ('draft', 'pending') THEN
      NEW.status := 'draft';
    END IF;
    NEW.verified := false;
    NEW.featured := false;
    NEW.under_review := false;
    NEW.under_review_reason := NULL;
    NEW.rejection_reason := NULL;
    NEW.verification_status := 'not_submitted';
    RETURN NEW;
  END IF;

  -- Moderation and verification state belong to admins only.
  NEW.verified := OLD.verified;
  NEW.featured := OLD.featured;
  NEW.under_review := OLD.under_review;
  NEW.under_review_reason := OLD.under_review_reason;
  NEW.rejection_reason := OLD.rejection_reason;
  IF NOT syncing THEN
    NEW.verification_status := OLD.verification_status;
  END IF;

  -- A listing paused by moderation cannot be republished by its owner.
  IF OLD.under_review AND NEW.status = 'live' AND OLD.status <> 'live' THEN
    NEW.status := OLD.status;
    RETURN NEW;
  END IF;

  IF NEW.status = 'live' AND OLD.status <> 'live' THEN
    IF array_length(private.listing_missing(NEW), 1) IS NOT NULL THEN
      NEW.status := OLD.status;
    END IF;
  END IF;

  RETURN NEW;
END $$;

-- 4. Owner-facing publish call: returns what is still missing, or publishes
CREATE OR REPLACE FUNCTION public.publish_property(_property_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','private'
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
  RETURN jsonb_build_object('published', true, 'paused', false, 'missing', '[]'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.publish_property(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.publish_property(uuid) TO authenticated;

-- 5. Keep the property verification state in step with verification requests
CREATE OR REPLACE FUNCTION public.tg_property_verification_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE next_state text;
BEGIN
  IF NEW.subject_type <> 'property' OR NEW.property_id IS NULL THEN RETURN NEW; END IF;

  next_state := CASE NEW.status
    WHEN 'approved' THEN 'verified'
    WHEN 'rejected' THEN 'issue'
    WHEN 'expired'  THEN 'issue'
    WHEN 'revoked'  THEN 'issue'
    ELSE 'in_progress' END;

  PERFORM set_config('spaces.sync', '1', true);
  UPDATE public.properties SET verification_status = next_state WHERE id = NEW.property_id;
  PERFORM set_config('spaces.sync', '0', true);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_property_verification_sync ON public.verification_requests;
CREATE TRIGGER trg_property_verification_sync
AFTER INSERT OR UPDATE OF status ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_property_verification_sync();

-- 6. Owner notifications reflect instant publication
CREATE OR REPLACE FUNCTION public.tg_property_decision_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE a RECORD;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  IF NEW.status = 'pending' AND OLD.status <> 'pending' THEN
    FOR a IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','super_admin') LOOP
      INSERT INTO public.notifications(user_id, kind, title, body, link, data)
      VALUES (a.user_id, 'listing_queue', 'Space awaiting approval',
              COALESCE(NEW.title,'A space') || ' was submitted for review.',
              '/admin/properties', jsonb_build_object('property_id', NEW.id));
    END LOOP;
  ELSIF NEW.status = 'live' AND OLD.status IN ('pending','draft','rejected','paused') THEN
    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (NEW.owner_id, 'listing_moderation', 'Your space is now live on SPACES',
            COALESCE(NEW.title,'Your space') || ' is visible to customers. SPACES verification continues separately.',
            '/dashboard/properties', jsonb_build_object('property_id', NEW.id));
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (NEW.owner_id, 'listing_moderation', 'Your space needs changes',
            COALESCE(NEW.rejection_reason, 'Please review the listing details and submit again.'),
            '/dashboard/properties', jsonb_build_object('property_id', NEW.id));
  ELSIF NEW.status = 'paused' AND OLD.status = 'live' THEN
    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (NEW.owner_id, 'listing_moderation', 'Your listing has been temporarily paused',
            COALESCE(NEW.under_review_reason, 'Your listing has been temporarily paused while SPACES reviews an issue.'),
            '/dashboard/properties', jsonb_build_object('property_id', NEW.id));
  END IF;
  RETURN NEW;
END $$;
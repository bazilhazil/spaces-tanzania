-- 1. Profile verification flags -------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verified_identity boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_owner boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_agent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_business boolean NOT NULL DEFAULT false;

-- 2. Verification request extras -------------------------------------------
ALTER TABLE public.verification_requests
  ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS internal_notes text;

-- 3. Decision / audit trail -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.verification_requests(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  from_status text,
  to_status text,
  reason text,
  internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.verification_events TO authenticated;
GRANT ALL ON public.verification_events TO service_role;

ALTER TABLE public.verification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Requesters read their own public events" ON public.verification_events;
CREATE POLICY "Requesters read their own public events"
ON public.verification_events FOR SELECT TO authenticated
USING (
  (internal = false AND EXISTS (
     SELECT 1 FROM public.verification_requests r
     WHERE r.id = request_id AND r.requester_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "Admins write events" ON public.verification_events;
CREATE POLICY "Admins write events"
ON public.verification_events FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

-- 4. Public views expose verified / featured --------------------------------
DROP VIEW IF EXISTS public.public_properties;
CREATE VIEW public.public_properties
WITH (security_invoker = true) AS
SELECT
  p.id, p.owner_id, p.property_type, p.listing_type, p.title, p.description,
  p.price, p.currency, p.negotiable, p.bedrooms, p.bathrooms, p.parking,
  p.area_sqm, p.region, p.district, p.ward, p.street, p.address,
  p.latitude, p.longitude, p.amenities, p.status, p.view_count,
  p.floor, p.year_built, p.landmark, p.verified, p.featured,
  p.created_at, p.updated_at
FROM public.properties p
WHERE p.status = 'live';

GRANT SELECT ON public.public_properties TO anon, authenticated;

DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT
  pr.id, pr.full_name, pr.avatar_url, pr.agency_name, pr.business_name,
  pr.location, pr.bio, pr.created_at,
  pr.verified_identity, pr.verified_owner, pr.verified_agent, pr.verified_business
FROM public.profiles pr;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 5. Submission trigger -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_verification_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE a RECORD;
BEGIN
  INSERT INTO public.verification_events(request_id, actor_id, action, to_status, internal)
  VALUES (NEW.id, NEW.requester_id, 'submitted', NEW.status, false);

  INSERT INTO public.notifications(user_id, kind, title, body, link, data)
  VALUES (NEW.requester_id, 'verification_submitted', 'Verification submitted',
          'We received your ' || NEW.subject_type || ' verification and will review it shortly.',
          '/verification', jsonb_build_object('request_id', NEW.id, 'subject_type', NEW.subject_type));

  FOR a IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','super_admin') LOOP
    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (a.user_id, 'verification_queue', 'New verification submission',
            'A new ' || NEW.subject_type || ' verification is awaiting review.',
            '/verification-hub', jsonb_build_object('request_id', NEW.id));
  END LOOP;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS verification_submitted ON public.verification_requests;
CREATE TRIGGER verification_submitted
AFTER INSERT ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_verification_submitted();

-- 6. Review / decision trigger ---------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_verification_reviewed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_title text;
  v_body  text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  NEW.reviewed_at := now();
  IF NEW.reviewer_id IS NULL THEN NEW.reviewer_id := auth.uid(); END IF;

  INSERT INTO public.verification_events(request_id, actor_id, action, from_status, to_status, reason, internal)
  VALUES (NEW.id, auth.uid(),
          CASE NEW.status
            WHEN 'approved' THEN 'approved'
            WHEN 'rejected' THEN 'rejected'
            WHEN 'more_info' THEN 'requested_more'
            WHEN 'under_review' THEN 'under_review'
            ELSE 'updated' END,
          OLD.status, NEW.status, NEW.review_reason, false);

  -- Apply / revoke badges only on an explicit decision
  IF NEW.subject_type = 'property' AND NEW.property_id IS NOT NULL THEN
    IF NEW.status = 'approved' THEN
      UPDATE public.properties SET verified = true WHERE id = NEW.property_id;
    ELSIF NEW.status IN ('rejected','expired','revoked') THEN
      UPDATE public.properties SET verified = false WHERE id = NEW.property_id;
    END IF;
  ELSE
    IF NEW.status = 'approved' THEN
      UPDATE public.profiles SET
        verified_identity = CASE WHEN NEW.subject_type IN ('identity','user','owner','agent') THEN true ELSE verified_identity END,
        verified_owner    = CASE WHEN NEW.subject_type = 'owner'    THEN true ELSE verified_owner END,
        verified_agent    = CASE WHEN NEW.subject_type = 'agent'    THEN true ELSE verified_agent END,
        verified_business = CASE WHEN NEW.subject_type = 'business' THEN true ELSE verified_business END
      WHERE id = NEW.requester_id;
    ELSIF NEW.status IN ('rejected','expired','revoked') THEN
      UPDATE public.profiles SET
        verified_identity = CASE WHEN NEW.subject_type IN ('identity','user') THEN false ELSE verified_identity END,
        verified_owner    = CASE WHEN NEW.subject_type = 'owner'    THEN false ELSE verified_owner END,
        verified_agent    = CASE WHEN NEW.subject_type = 'agent'    THEN false ELSE verified_agent END,
        verified_business = CASE WHEN NEW.subject_type = 'business' THEN false ELSE verified_business END
      WHERE id = NEW.requester_id;
    END IF;
  END IF;

  v_title := CASE NEW.status
    WHEN 'approved'  THEN 'Verification approved'
    WHEN 'rejected'  THEN 'Verification rejected'
    WHEN 'more_info' THEN 'More information required'
    WHEN 'under_review' THEN 'Verification under review'
    ELSE 'Verification updated' END;
  v_body := COALESCE(NEW.review_reason,
    'Your ' || NEW.subject_type || ' verification status is now ' || replace(NEW.status,'_',' ') || '.');

  INSERT INTO public.notifications(user_id, kind, title, body, link, data)
  VALUES (NEW.requester_id, 'verification_status', v_title, v_body, '/verification',
          jsonb_build_object('request_id', NEW.id, 'status', NEW.status, 'subject_type', NEW.subject_type));

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS verification_reviewed ON public.verification_requests;
CREATE TRIGGER verification_reviewed
BEFORE UPDATE ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_verification_reviewed();

-- 7. Listing report notifications ------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_property_report_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE a RECORD; v_title text;
BEGIN
  SELECT title INTO v_title FROM public.properties WHERE id = NEW.property_id;
  IF NEW.reporter_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (NEW.reporter_id, 'report_received', 'Report received',
            'Thanks — our trust team will review your report on ' || COALESCE(v_title,'this listing') || '.',
            '/notifications', jsonb_build_object('report_id', NEW.id, 'property_id', NEW.property_id));
  END IF;
  FOR a IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','super_admin') LOOP
    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (a.user_id, 'report_queue', 'New listing report',
            COALESCE(v_title,'A listing') || ' was reported: ' || NEW.reason,
            '/admin/reports', jsonb_build_object('report_id', NEW.id, 'property_id', NEW.property_id));
  END LOOP;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS property_report_notify ON public.property_reports;
CREATE TRIGGER property_report_notify
AFTER INSERT ON public.property_reports
FOR EACH ROW EXECUTE FUNCTION public.tg_property_report_notify();

-- 8. Private verification document storage ----------------------------------
DROP POLICY IF EXISTS "Users manage own verification documents" ON storage.objects;
CREATE POLICY "Users manage own verification documents"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'verification-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Admins read verification documents" ON storage.objects;
CREATE POLICY "Admins read verification documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);
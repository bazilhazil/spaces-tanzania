DROP POLICY IF EXISTS "requesters submit own verifications" ON public.verification_requests;
CREATE POLICY "requesters submit own verifications" ON public.verification_requests
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = requester_id AND status = 'pending' AND reviewer_id IS NULL AND reviewed_at IS NULL AND review_reason IS NULL
  AND subject_type = ANY (ARRAY['user','owner','agent','property','business','property_manager'])
  AND (
    (subject_type = 'property' AND property_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id = verification_requests.property_id AND p.owner_id = auth.uid()))
    OR (subject_type <> 'property' AND property_id IS NULL)
  )
  AND (
    subject_type <> 'property_manager' OR NOT EXISTS (
      SELECT 1 FROM public.verification_requests v
      WHERE v.requester_id = auth.uid() AND v.subject_type = 'property_manager'
        AND v.status IN ('pending','under_review','more_info'))
  )
);

CREATE OR REPLACE FUNCTION public.tg_verification_reviewed()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_title text; v_body text; v_label text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  NEW.reviewed_at := now();
  IF NEW.reviewer_id IS NULL THEN NEW.reviewer_id := auth.uid(); END IF;

  INSERT INTO public.verification_events(request_id, actor_id, action, from_status, to_status, reason, internal)
  VALUES (NEW.id, auth.uid(),
          CASE NEW.status WHEN 'approved' THEN 'approved' WHEN 'rejected' THEN 'rejected'
            WHEN 'more_info' THEN 'requested_more' WHEN 'under_review' THEN 'under_review' ELSE 'updated' END,
          OLD.status, NEW.status, NEW.review_reason, false);

  IF NEW.subject_type = 'property' AND NEW.property_id IS NOT NULL THEN
    IF NEW.status = 'approved' THEN UPDATE public.properties SET verified = true WHERE id = NEW.property_id;
    ELSIF NEW.status IN ('rejected','expired','revoked') THEN UPDATE public.properties SET verified = false WHERE id = NEW.property_id;
    END IF;
  ELSIF NEW.subject_type <> 'property_manager' THEN
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

  IF NEW.subject_type = 'property_manager' THEN
    v_title := CASE NEW.status WHEN 'approved' THEN 'Property Manager access approved'
      WHEN 'rejected' THEN 'Property Manager request not approved'
      WHEN 'more_info' THEN 'More information required' ELSE 'Property Manager request updated' END;
    v_body := COALESCE(NEW.review_reason, CASE NEW.status
      WHEN 'approved' THEN 'Your Property Manager workspace is now available from your dashboard.'
      ELSE 'Your Property Manager request status is now ' || replace(NEW.status,'_',' ') || '.' END);
    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (NEW.requester_id, 'verification_status', v_title, v_body,
            CASE WHEN NEW.status = 'approved' THEN '/management' ELSE '/dashboard/mode' END,
            jsonb_build_object('request_id', NEW.id, 'status', NEW.status, 'subject_type', NEW.subject_type));
    RETURN NEW;
  END IF;

  v_title := CASE NEW.status WHEN 'approved' THEN 'Verification approved' WHEN 'rejected' THEN 'Verification rejected'
    WHEN 'more_info' THEN 'More information required' WHEN 'under_review' THEN 'Verification under review'
    ELSE 'Verification updated' END;
  v_body := COALESCE(NEW.review_reason,
    'Your ' || NEW.subject_type || ' verification status is now ' || replace(NEW.status,'_',' ') || '.');
  INSERT INTO public.notifications(user_id, kind, title, body, link, data)
  VALUES (NEW.requester_id, 'verification_status', v_title, v_body, '/verification',
          jsonb_build_object('request_id', NEW.id, 'status', NEW.status, 'subject_type', NEW.subject_type));
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.tg_verification_submitted()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE a RECORD; v_label text := CASE WHEN NEW.subject_type = 'property_manager' THEN 'Property Manager access' ELSE NEW.subject_type || ' verification' END;
BEGIN
  INSERT INTO public.verification_events(request_id, actor_id, action, to_status, internal)
  VALUES (NEW.id, NEW.requester_id, 'submitted', NEW.status, false);
  INSERT INTO public.notifications(user_id, kind, title, body, link, data)
  VALUES (NEW.requester_id, 'verification_submitted',
          CASE WHEN NEW.subject_type = 'property_manager' THEN 'Request submitted' ELSE 'Verification submitted' END,
          'We received your ' || v_label || ' request and will review it shortly.',
          CASE WHEN NEW.subject_type = 'property_manager' THEN '/dashboard/mode' ELSE '/verification' END,
          jsonb_build_object('request_id', NEW.id, 'subject_type', NEW.subject_type));
  FOR a IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','super_admin') LOOP
    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (a.user_id, 'verification_queue', 'New verification submission',
            'A new ' || v_label || ' request is awaiting review.',
            '/admin/verification', jsonb_build_object('request_id', NEW.id));
  END LOOP;
  RETURN NEW;
END; $function$;
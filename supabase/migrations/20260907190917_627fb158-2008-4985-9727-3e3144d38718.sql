CREATE OR REPLACE FUNCTION public.tg_property_submit_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean := public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin');
BEGIN
  IF is_admin OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- A brand new listing can only be a draft or a review submission.
    IF NEW.status NOT IN ('draft', 'pending') THEN
      NEW.status := 'pending';
    END IF;
    NEW.verified := false;
    NEW.featured := false;
    NEW.under_review := false;
    NEW.under_review_reason := NULL;
    NEW.rejection_reason := NULL;
    RETURN NEW;
  END IF;

  -- Moderation state belongs to admins only.
  NEW.verified := OLD.verified;
  NEW.featured := OLD.featured;
  NEW.under_review := OLD.under_review;
  NEW.under_review_reason := OLD.under_review_reason;
  NEW.rejection_reason := OLD.rejection_reason;

  -- Going public requires a previous approval; otherwise queue for review.
  IF NEW.status = 'live'
     AND OLD.status <> 'live'
     AND OLD.status NOT IN ('paused', 'sold', 'rented', 'archived') THEN
    NEW.status := 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS property_submit_guard ON public.properties;
CREATE TRIGGER property_submit_guard
BEFORE INSERT OR UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.tg_property_submit_guard();

CREATE OR REPLACE FUNCTION public.tg_property_resubmitted_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE a RECORD;
BEGIN
  IF NEW.status = 'pending' AND OLD.status IS DISTINCT FROM 'pending' THEN
    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (NEW.owner_id, 'listing_moderation', 'Your space is pending review',
            'We received "' || COALESCE(NEW.title, 'your space') || '". Our team will review it shortly.',
            '/dashboard/properties', jsonb_build_object('property_id', NEW.id));

    FOR a IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','super_admin') LOOP
      INSERT INTO public.notifications(user_id, kind, title, body, link, data)
      VALUES (a.user_id, 'listing_queue', 'Space awaiting approval',
              COALESCE(NEW.title, 'A space') || ' was submitted for review.',
              '/admin/properties', jsonb_build_object('property_id', NEW.id));
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS property_resubmitted_notify ON public.properties;
CREATE TRIGGER property_resubmitted_notify
AFTER UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.tg_property_resubmitted_notify();
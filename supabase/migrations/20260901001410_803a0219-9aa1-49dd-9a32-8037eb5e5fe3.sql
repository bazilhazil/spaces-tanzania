
-- 1. Property submission + moderation decisions -----------------------------
CREATE OR REPLACE FUNCTION public.tg_property_submitted_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE a RECORD;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;

  INSERT INTO public.notifications(user_id, kind, title, body, link, data)
  VALUES (NEW.owner_id, 'listing_moderation', 'Your space is pending review',
          'We received "' || COALESCE(NEW.title,'your space') || '". Our team will review it shortly.',
          '/dashboard/properties', jsonb_build_object('property_id', NEW.id));

  FOR a IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','super_admin') LOOP
    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (a.user_id, 'listing_queue', 'New space awaiting approval',
            COALESCE(NEW.title,'A new space') || ' was submitted for review.',
            '/admin/properties', jsonb_build_object('property_id', NEW.id));
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS property_submitted_notify ON public.properties;
CREATE TRIGGER property_submitted_notify
AFTER INSERT ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.tg_property_submitted_notify();

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
    VALUES (NEW.owner_id, 'listing_moderation', 'Your space is published',
            COALESCE(NEW.title,'Your space') || ' is approved and now visible in search.',
            '/dashboard/properties', jsonb_build_object('property_id', NEW.id));
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (NEW.owner_id, 'listing_moderation', 'Your space needs changes',
            COALESCE(NEW.rejection_reason, 'Please review the listing details and submit again.'),
            '/dashboard/properties', jsonb_build_object('property_id', NEW.id));
  ELSIF NEW.status = 'paused' AND OLD.status = 'live' THEN
    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (NEW.owner_id, 'listing_moderation', 'Your space is paused',
            COALESCE(NEW.under_review_reason, 'Your space is temporarily hidden from search.'),
            '/dashboard/properties', jsonb_build_object('property_id', NEW.id));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS property_decision_notify ON public.properties;
CREATE TRIGGER property_decision_notify
AFTER UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.tg_property_decision_notify();

-- 2. New owner / agent registration -----------------------------------------
CREATE OR REPLACE FUNCTION public.tg_new_user_admin_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE a RECORD; v_name text;
BEGIN
  IF NEW.role NOT IN ('owner','agent') THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, email, 'A new user') INTO v_name FROM public.profiles WHERE id = NEW.user_id;

  FOR a IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','super_admin') LOOP
    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (a.user_id, 'user_queue', 'New user registered',
            COALESCE(v_name,'A new user') || ' registered as ' || NEW.role || '.',
            '/admin/users', jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role));
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS new_user_admin_notify ON public.user_roles;
CREATE TRIGGER new_user_admin_notify
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.tg_new_user_admin_notify();

-- 3. Failed payments reach the admin queue ----------------------------------
CREATE OR REPLACE FUNCTION public.tg_payment_issue_admin_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE a RECORD;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('failed','cancelled') THEN RETURN NEW; END IF;

  FOR a IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','super_admin') LOOP
    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (a.user_id, 'payment_queue', 'Payment issue',
            'A ' || COALESCE(NEW.purpose,'payment') || ' payment of ' || COALESCE(NEW.currency,'TZS') || ' ' ||
            to_char(NEW.amount, 'FM999,999,999') || ' did not complete.',
            '/admin/payments', jsonb_build_object('payment_id', NEW.id, 'user_id', NEW.user_id));
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS payment_issue_admin_notify ON public.payments;
CREATE TRIGGER payment_issue_admin_notify
AFTER UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.tg_payment_issue_admin_notify();

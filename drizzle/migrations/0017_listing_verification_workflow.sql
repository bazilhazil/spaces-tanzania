-- 1. Allow the "more information required" state on listing verification.
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_verification_status_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_verification_status_check
  CHECK (verification_status = ANY (ARRAY['not_submitted','in_progress','more_info','verified','issue']));

-- 2. Only administrators may change verification state on a listing.
CREATE OR REPLACE FUNCTION public.tg_guard_property_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE is_admin boolean;
BEGIN
  IF NEW.verified IS NOT DISTINCT FROM OLD.verified
     AND NEW.verification_status IS NOT DISTINCT FROM OLD.verification_status THEN
    RETURN NEW;
  END IF;

  -- Changes made by the verification_requests sync trigger are trusted.
  IF coalesce(current_setting('spaces.sync', true), '0') = '1' THEN
    RETURN NEW;
  END IF;

  is_admin := has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role);
  IF NOT is_admin THEN
    NEW.verified := OLD.verified;
    NEW.verification_status := OLD.verification_status;
  END IF;
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.tg_guard_property_verification() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS guard_property_verification ON public.properties;
CREATE TRIGGER guard_property_verification
BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.tg_guard_property_verification();

-- 3. Tell the owner when the verification state of their listing changes.
CREATE OR REPLACE FUNCTION public.tg_property_verification_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE title text; body text;
BEGIN
  IF NEW.verification_status IS NOT DISTINCT FROM OLD.verification_status
     AND NEW.verified IS NOT DISTINCT FROM OLD.verified THEN
    RETURN NEW;
  END IF;

  IF NEW.verified AND NOT coalesce(OLD.verified, false) THEN
    title := 'Verified by SPACES';
    body := NEW.title || ' has completed SPACES verification.';
  ELSIF NEW.verification_status = 'more_info' THEN
    title := 'Action required on your listing';
    body := 'SPACES needs more information about ' || NEW.title ||
            coalesce(': ' || nullif(NEW.under_review_reason, ''), '.');
  ELSIF NEW.verification_status = 'issue' THEN
    title := 'Verification issue on your listing';
    body := 'SPACES could not verify ' || NEW.title ||
            coalesce(': ' || nullif(NEW.under_review_reason, ''), '.');
  ELSIF NEW.verification_status = 'in_progress' THEN
    title := 'Verification in progress';
    body := NEW.title || ' is live and SPACES verification is under way.';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, kind, title, body, link, data)
  VALUES (NEW.owner_id, 'verification', title, body,
          '/dashboard/properties/' || NEW.id::text || '/manage',
          jsonb_build_object('property_id', NEW.id, 'verification_status', NEW.verification_status));
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.tg_property_verification_notify() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS property_verification_notify ON public.properties;
CREATE TRIGGER property_verification_notify
AFTER UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.tg_property_verification_notify();

-- 4. Admin-configurable "taking longer than usual" threshold.
INSERT INTO public.admin_settings (key, value)
VALUES ('verification_sla_days', jsonb_build_object('days', 7))
ON CONFLICT (key) DO NOTHING;
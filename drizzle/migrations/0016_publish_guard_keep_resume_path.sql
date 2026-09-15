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

  -- First publication requires the automated minimum requirements.
  -- Resuming a listing that was already public keeps working as before.
  IF NEW.status = 'live'
     AND OLD.status NOT IN ('live', 'paused', 'sold', 'rented', 'archived') THEN
    IF array_length(private.listing_missing(NEW), 1) IS NOT NULL THEN
      NEW.status := OLD.status;
    END IF;
  END IF;

  RETURN NEW;
END $$;
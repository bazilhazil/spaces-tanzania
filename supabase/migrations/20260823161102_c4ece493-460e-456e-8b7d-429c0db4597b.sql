-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.review_subject_type AS ENUM ('property','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.review_status AS ENUM ('pending','published','flagged','removed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ TABLES ============
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type public.review_subject_type NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  subject_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_role text NOT NULL DEFAULT 'buyer',
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  categories jsonb NOT NULL DEFAULT '{}'::jsonb,
  comment text,
  status public.review_status NOT NULL DEFAULT 'pending',
  status_reason text,
  published_at timestamptz,
  response text,
  response_at timestamptz,
  response_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reviews_subject_target_ck CHECK (
    (subject_type = 'property' AND property_id IS NOT NULL)
    OR (subject_type = 'user' AND subject_user_id IS NOT NULL)
  ),
  CONSTRAINT reviews_no_self_ck CHECK (subject_user_id IS NULL OR subject_user_id <> reviewer_id),
  CONSTRAINT reviews_source_ck CHECK (booking_id IS NOT NULL OR deal_id IS NOT NULL)
);

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_unique_booking_property
  ON public.reviews (reviewer_id, booking_id) WHERE subject_type = 'property' AND booking_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_unique_booking_user
  ON public.reviews (reviewer_id, booking_id, subject_user_id) WHERE subject_type = 'user' AND booking_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_unique_deal_property
  ON public.reviews (reviewer_id, deal_id) WHERE subject_type = 'property' AND deal_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_unique_deal_user
  ON public.reviews (reviewer_id, deal_id, subject_user_id) WHERE subject_type = 'user' AND deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reviews_property_idx ON public.reviews (property_id, status);
CREATE INDEX IF NOT EXISTS reviews_subject_user_idx ON public.reviews (subject_user_id, status);
CREATE INDEX IF NOT EXISTS reviews_reviewer_idx ON public.reviews (reviewer_id);

CREATE TABLE IF NOT EXISTS public.review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, reporter_id)
);

GRANT SELECT, INSERT ON public.review_reports TO authenticated;
GRANT UPDATE ON public.review_reports TO authenticated;
GRANT ALL ON public.review_reports TO service_role;

CREATE TABLE IF NOT EXISTS public.review_moderation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  from_status text,
  to_status text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.review_moderation_events TO authenticated;
GRANT ALL ON public.review_moderation_events TO service_role;

-- ============ ELIGIBILITY ============
CREATE OR REPLACE FUNCTION public.can_review(
  _reviewer uuid,
  _subject_type text,
  _property_id uuid,
  _subject_user_id uuid,
  _booking_id uuid,
  _deal_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE b RECORD; d RECORD;
BEGIN
  IF _reviewer IS NULL THEN RETURN false; END IF;
  IF _subject_user_id IS NOT NULL AND _subject_user_id = _reviewer THEN RETURN false; END IF;

  IF _booking_id IS NOT NULL THEN
    SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
    IF NOT FOUND OR b.status <> 'completed' THEN RETURN false; END IF;
    IF _reviewer NOT IN (COALESCE(b.buyer_id,'00000000-0000-0000-0000-000000000000'::uuid),
                         COALESCE(b.owner_id,'00000000-0000-0000-0000-000000000000'::uuid),
                         COALESCE(b.agent_id,'00000000-0000-0000-0000-000000000000'::uuid),
                         COALESCE(b.recipient_id,'00000000-0000-0000-0000-000000000000'::uuid)) THEN
      RETURN false;
    END IF;
    IF _subject_type = 'property' THEN
      RETURN _property_id = b.property_id AND _reviewer = b.buyer_id;
    ELSE
      RETURN _subject_user_id IN (COALESCE(b.buyer_id, '00000000-0000-0000-0000-000000000000'::uuid),
                                  COALESCE(b.owner_id, '00000000-0000-0000-0000-000000000000'::uuid),
                                  COALESCE(b.agent_id, '00000000-0000-0000-0000-000000000000'::uuid),
                                  COALESCE(b.recipient_id,'00000000-0000-0000-0000-000000000000'::uuid));
    END IF;
  END IF;

  IF _deal_id IS NOT NULL THEN
    SELECT * INTO d FROM public.deals WHERE id = _deal_id;
    IF NOT FOUND OR d.stage <> 'completed' THEN RETURN false; END IF;
    IF _reviewer NOT IN (COALESCE(d.buyer_id,'00000000-0000-0000-0000-000000000000'::uuid),
                         COALESCE(d.owner_id,'00000000-0000-0000-0000-000000000000'::uuid),
                         COALESCE(d.agent_id,'00000000-0000-0000-0000-000000000000'::uuid)) THEN
      RETURN false;
    END IF;
    IF _subject_type = 'property' THEN
      RETURN _property_id = d.property_id AND _reviewer = d.buyer_id;
    ELSE
      RETURN _subject_user_id IN (COALESCE(d.buyer_id,'00000000-0000-0000-0000-000000000000'::uuid),
                                  COALESCE(d.owner_id,'00000000-0000-0000-0000-000000000000'::uuid),
                                  COALESCE(d.agent_id,'00000000-0000-0000-0000-000000000000'::uuid));
    END IF;
  END IF;

  RETURN false;
END; $$;

REVOKE ALL ON FUNCTION public.can_review(uuid,text,uuid,uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_review(uuid,text,uuid,uuid,uuid,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.my_review_opportunities()
RETURNS TABLE(
  source text, source_id uuid, property_id uuid, property_title text,
  counterpart_id uuid, counterpart_name text, occurred_at timestamptz,
  property_reviewed boolean, counterpart_reviewed boolean, can_review_property boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 'booking'::text, b.id, b.property_id, p.title,
         CASE WHEN auth.uid() = b.buyer_id THEN COALESCE(b.recipient_id, b.agent_id, b.owner_id) ELSE b.buyer_id END,
         CASE WHEN auth.uid() = b.buyer_id THEN pr.full_name ELSE b.buyer_name END,
         b.scheduled_at,
         EXISTS (SELECT 1 FROM public.reviews r WHERE r.reviewer_id = auth.uid() AND r.booking_id = b.id AND r.subject_type='property'),
         EXISTS (SELECT 1 FROM public.reviews r WHERE r.reviewer_id = auth.uid() AND r.booking_id = b.id AND r.subject_type='user'),
         auth.uid() = b.buyer_id
  FROM public.bookings b
  LEFT JOIN public.properties p ON p.id = b.property_id
  LEFT JOIN public.profiles pr ON pr.id = COALESCE(b.recipient_id, b.agent_id, b.owner_id)
  WHERE b.status = 'completed'
    AND auth.uid() IN (b.buyer_id, b.owner_id, COALESCE(b.agent_id, b.owner_id), COALESCE(b.recipient_id, b.owner_id))
  UNION ALL
  SELECT 'deal'::text, d.id, d.property_id, p.title,
         CASE WHEN auth.uid() = d.buyer_id THEN COALESCE(d.agent_id, d.owner_id) ELSE d.buyer_id END,
         CASE WHEN auth.uid() = d.buyer_id THEN pr.full_name ELSE d.buyer_name END,
         COALESCE(d.completed_at, d.updated_at),
         EXISTS (SELECT 1 FROM public.reviews r WHERE r.reviewer_id = auth.uid() AND r.deal_id = d.id AND r.subject_type='property'),
         EXISTS (SELECT 1 FROM public.reviews r WHERE r.reviewer_id = auth.uid() AND r.deal_id = d.id AND r.subject_type='user'),
         auth.uid() = d.buyer_id
  FROM public.deals d
  LEFT JOIN public.properties p ON p.id = d.property_id
  LEFT JOIN public.profiles pr ON pr.id = COALESCE(d.agent_id, d.owner_id)
  WHERE d.stage = 'completed'
    AND auth.uid() IN (COALESCE(d.buyer_id,'00000000-0000-0000-0000-000000000000'::uuid),
                       COALESCE(d.owner_id,'00000000-0000-0000-0000-000000000000'::uuid),
                       COALESCE(d.agent_id,'00000000-0000-0000-0000-000000000000'::uuid));
$$;

REVOKE ALL ON FUNCTION public.my_review_opportunities() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_review_opportunities() TO authenticated, service_role;

-- ============ AGGREGATES ============
CREATE OR REPLACE FUNCTION public.property_rating(_property_id uuid)
RETURNS TABLE(average numeric, total bigint)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT ROUND(AVG(rating)::numeric, 2), COUNT(*)
  FROM public.reviews
  WHERE property_id = _property_id AND subject_type='property' AND status='published';
$$;
GRANT EXECUTE ON FUNCTION public.property_rating(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.user_rating(_user_id uuid)
RETURNS TABLE(average numeric, total bigint)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT ROUND(AVG(rating)::numeric, 2), COUNT(*)
  FROM public.reviews
  WHERE subject_user_id = _user_id AND subject_type='user' AND status='published';
$$;
GRANT EXECUTE ON FUNCTION public.user_rating(uuid) TO anon, authenticated, service_role;

-- ============ MODERATION / NOTIFICATIONS ============
CREATE OR REPLACE FUNCTION public.tg_review_submit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_text text;
  v_flagged boolean := false;
BEGIN
  v_text := lower(COALESCE(NEW.comment, ''));
  IF v_text ~ '(\+?255|07\d{8}|\d{9,})' OR v_text ~ '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
     OR v_text ~ '(http://|https://|www\.)'
     OR v_text ~ '(scam|fraud|idiot|stupid|fuck|shit|whatsapp me|call me on)' THEN
    v_flagged := true;
  END IF;

  IF v_flagged THEN
    NEW.status := 'pending';
    NEW.status_reason := 'Held for moderation: possible contact details or prohibited content.';
  ELSE
    NEW.status := 'published';
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS review_submit ON public.reviews;
CREATE TRIGGER review_submit BEFORE INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.tg_review_submit();

CREATE OR REPLACE FUNCTION public.tg_review_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.review_moderation_events(review_id, actor_id, action, to_status, reason)
  VALUES (NEW.id, NEW.reviewer_id, 'submitted', NEW.status::text, NEW.status_reason);

  INSERT INTO public.notifications(user_id, kind, title, body, link, data)
  VALUES (NEW.reviewer_id, 'review_status',
          CASE WHEN NEW.status = 'published' THEN 'Review published' ELSE 'Review received' END,
          CASE WHEN NEW.status = 'published' THEN 'Thanks — your review is now live on SPACES.'
               ELSE 'Thanks — your review is being checked by our trust team.' END,
          '/reviews', jsonb_build_object('review_id', NEW.id));

  IF NEW.status = 'published' AND NEW.subject_user_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (NEW.subject_user_id, 'review_received', 'You received a new review',
            'Someone you worked with left you a ' || NEW.rating || '-star review.',
            '/reviews', jsonb_build_object('review_id', NEW.id));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS review_after_insert ON public.reviews;
CREATE TRIGGER review_after_insert AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.tg_review_after_insert();

CREATE OR REPLACE FUNCTION public.tg_review_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_title text;
BEGIN
  NEW.updated_at := now();

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'published' AND NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
    INSERT INTO public.review_moderation_events(review_id, actor_id, action, from_status, to_status, reason)
    VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status::text, NEW.status::text, NEW.status_reason);

    v_title := CASE NEW.status
      WHEN 'published' THEN 'Your review is published'
      WHEN 'flagged'   THEN 'Your review was flagged'
      WHEN 'removed'   THEN 'Your review was removed'
      ELSE 'Your review is under review' END;

    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (NEW.reviewer_id, 'review_status', v_title,
            COALESCE(NEW.status_reason, 'A moderator updated the status of your review.'),
            '/reviews', jsonb_build_object('review_id', NEW.id, 'status', NEW.status));
  END IF;

  IF NEW.response IS DISTINCT FROM OLD.response AND NEW.response IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (NEW.reviewer_id, 'review_response', 'Someone responded to your review',
            'The owner or agent you reviewed has replied.',
            '/reviews', jsonb_build_object('review_id', NEW.id));
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS review_status_change ON public.reviews;
CREATE TRIGGER review_status_change BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.tg_review_status_change();

-- Eligibility notifications
CREATE OR REPLACE FUNCTION public.tg_booking_review_invite()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    IF NEW.buyer_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, kind, title, body, link, data)
      VALUES (NEW.buyer_id, 'review_invite', 'How was your viewing?',
              'Share your experience — it helps other people on SPACES.',
              '/reviews', jsonb_build_object('booking_id', NEW.id, 'property_id', NEW.property_id));
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS booking_review_invite ON public.bookings;
CREATE TRIGGER booking_review_invite AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_booking_review_invite();

CREATE OR REPLACE FUNCTION public.tg_deal_review_invite()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.stage = 'completed' AND OLD.stage IS DISTINCT FROM 'completed' THEN
    IF NEW.buyer_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, kind, title, body, link, data)
      VALUES (NEW.buyer_id, 'review_invite', 'Leave a review',
              'Your deal is complete — tell others how it went.',
              '/reviews', jsonb_build_object('deal_id', NEW.id, 'property_id', NEW.property_id));
    END IF;
    IF NEW.owner_id IS NOT NULL AND NEW.owner_id <> COALESCE(NEW.buyer_id,'00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.notifications(user_id, kind, title, body, link, data)
      VALUES (NEW.owner_id, 'review_invite', 'Leave a review',
              'Your deal is complete — rate the person you worked with.',
              '/reviews', jsonb_build_object('deal_id', NEW.id));
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS deal_review_invite ON public.deals;
CREATE TRIGGER deal_review_invite AFTER UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.tg_deal_review_invite();

-- ============ RESPONSE RPC ============
CREATE OR REPLACE FUNCTION public.respond_to_review(_review_id uuid, _response text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r RECORD; v_allowed boolean := false;
BEGIN
  SELECT * INTO r FROM public.reviews WHERE id = _review_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Review not found'; END IF;
  IF r.status <> 'published' THEN RAISE EXCEPTION 'Only published reviews can be answered'; END IF;
  IF r.response IS NOT NULL THEN RAISE EXCEPTION 'You have already responded to this review'; END IF;

  IF r.subject_user_id = auth.uid() THEN
    v_allowed := true;
  ELSIF r.subject_type = 'property' AND r.property_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.properties p WHERE p.id = r.property_id AND p.owner_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.property_agents pa WHERE pa.property_id = r.property_id AND pa.agent_id = auth.uid()
    ) INTO v_allowed;
  END IF;

  IF NOT v_allowed THEN RAISE EXCEPTION 'Not allowed to respond to this review'; END IF;
  IF _response IS NULL OR length(btrim(_response)) < 2 THEN RAISE EXCEPTION 'Response is empty'; END IF;

  UPDATE public.reviews
    SET response = btrim(_response), response_at = now(), response_by = auth.uid()
    WHERE id = _review_id;
END; $$;

REVOKE ALL ON FUNCTION public.respond_to_review(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_review(uuid, text) TO authenticated, service_role;

-- ============ ADMIN MODERATION RPC ============
CREATE OR REPLACE FUNCTION public.moderate_review(_review_id uuid, _status text, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Admins only';
  END IF;
  IF _status NOT IN ('pending','published','flagged','removed') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  UPDATE public.reviews
     SET status = _status::public.review_status, status_reason = _reason
   WHERE id = _review_id;
END; $$;

REVOKE ALL ON FUNCTION public.moderate_review(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_review(uuid, text, text) TO authenticated, service_role;

-- ============ RLS ============
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_moderation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published reviews are public" ON public.reviews;
CREATE POLICY "Published reviews are public" ON public.reviews
FOR SELECT TO anon, authenticated USING (status = 'published');

DROP POLICY IF EXISTS "Reviewers read own reviews" ON public.reviews;
CREATE POLICY "Reviewers read own reviews" ON public.reviews
FOR SELECT TO authenticated USING (reviewer_id = auth.uid());

DROP POLICY IF EXISTS "Subjects read reviews about them" ON public.reviews;
CREATE POLICY "Subjects read reviews about them" ON public.reviews
FOR SELECT TO authenticated USING (
  subject_user_id = auth.uid()
  OR (property_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid()))
);

DROP POLICY IF EXISTS "Admins read all reviews" ON public.reviews;
CREATE POLICY "Admins read all reviews" ON public.reviews
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
);

DROP POLICY IF EXISTS "Eligible users create reviews" ON public.reviews;
CREATE POLICY "Eligible users create reviews" ON public.reviews
FOR INSERT TO authenticated WITH CHECK (
  reviewer_id = auth.uid()
  AND public.can_review(auth.uid(), subject_type::text, property_id, subject_user_id, booking_id, deal_id)
);

DROP POLICY IF EXISTS "Admins update reviews" ON public.reviews;
CREATE POLICY "Admins update reviews" ON public.reviews
FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
) WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
);

DROP POLICY IF EXISTS "Users report reviews" ON public.review_reports;
CREATE POLICY "Users report reviews" ON public.review_reports
FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Reporters read own reports" ON public.review_reports;
CREATE POLICY "Reporters read own reports" ON public.review_reports
FOR SELECT TO authenticated USING (
  reporter_id = auth.uid()
  OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
);

DROP POLICY IF EXISTS "Admins update reports" ON public.review_reports;
CREATE POLICY "Admins update reports" ON public.review_reports
FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
) WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
);

DROP POLICY IF EXISTS "Admins read moderation events" ON public.review_moderation_events;
CREATE POLICY "Admins read moderation events" ON public.review_moderation_events
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
  OR EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.reviewer_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins insert moderation events" ON public.review_moderation_events;
CREATE POLICY "Admins insert moderation events" ON public.review_moderation_events
FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
);

DROP TRIGGER IF EXISTS review_reports_set_updated_at ON public.review_reports;
CREATE TRIGGER review_reports_set_updated_at BEFORE UPDATE ON public.review_reports
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
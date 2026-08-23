-- ============ ENUMS ============
DO $$ BEGIN CREATE TYPE public.report_target_type AS ENUM ('property','user','message'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.report_status AS ENUM ('new','under_review','more_info','resolved','dismissed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.report_priority AS ENUM ('normal','high','urgent'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.account_status AS ENUM ('active','suspended','banned'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ PROFILE / PROPERTY COLUMNS ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status public.account_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS under_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS under_review_reason text;

-- ============ SAFETY REPORTS ============
CREATE TABLE IF NOT EXISTS public.safety_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('RPT-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  target_type public.report_target_type NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  evidence_path text,
  status public.report_status NOT NULL DEFAULT 'new',
  priority public.report_priority NOT NULL DEFAULT 'normal',
  assigned_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT safety_reports_target_ck CHECK (
    (target_type = 'property' AND property_id IS NOT NULL)
    OR (target_type = 'user' AND reported_user_id IS NOT NULL)
    OR (target_type = 'message' AND message_id IS NOT NULL)
  ),
  CONSTRAINT safety_reports_not_self CHECK (reported_user_id IS NULL OR reported_user_id <> reporter_id)
);

GRANT SELECT, INSERT, UPDATE ON public.safety_reports TO authenticated;
GRANT ALL ON public.safety_reports TO service_role;
ALTER TABLE public.safety_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reporters create their own reports" ON public.safety_reports;
CREATE POLICY "reporters create their own reports" ON public.safety_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND status = 'new' AND assigned_admin_id IS NULL AND resolution IS NULL);

DROP POLICY IF EXISTS "reporters read their own reports" ON public.safety_reports;
CREATE POLICY "reporters read their own reports" ON public.safety_reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "admins read all reports" ON public.safety_reports;
CREATE POLICY "admins read all reports" ON public.safety_reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "admins update reports" ON public.safety_reports;
CREATE POLICY "admins update reports" ON public.safety_reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- anti-abuse: one open report per reporter + target + reason
CREATE UNIQUE INDEX IF NOT EXISTS safety_reports_open_dedupe ON public.safety_reports (
  reporter_id, target_type, reason,
  COALESCE(property_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(reported_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(message_id, '00000000-0000-0000-0000-000000000000'::uuid)
) WHERE status IN ('new','under_review','more_info');

CREATE INDEX IF NOT EXISTS safety_reports_status_idx ON public.safety_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS safety_reports_reported_user_idx ON public.safety_reports (reported_user_id);

-- ============ MODERATION LOG (admin only) ============
CREATE TABLE IF NOT EXISTS public.report_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.safety_reports(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  note text,
  from_status public.report_status,
  to_status public.report_status,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.report_actions TO authenticated;
GRANT ALL ON public.report_actions TO service_role;
ALTER TABLE public.report_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read moderation log" ON public.report_actions;
CREATE POLICY "admins read moderation log" ON public.report_actions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "admins write moderation log" ON public.report_actions;
CREATE POLICY "admins write moderation log" ON public.report_actions
  FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) AND actor_id = auth.uid());

-- ============ USER BLOCKS ============
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CONSTRAINT user_blocks_not_self CHECK (blocker_id <> blocked_id)
);

GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own blocks readable" ON public.user_blocks;
CREATE POLICY "own blocks readable" ON public.user_blocks
  FOR SELECT TO authenticated USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

DROP POLICY IF EXISTS "block on own behalf" ON public.user_blocks;
CREATE POLICY "block on own behalf" ON public.user_blocks
  FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS "unblock own blocks" ON public.user_blocks;
CREATE POLICY "unblock own blocks" ON public.user_blocks
  FOR DELETE TO authenticated USING (blocker_id = auth.uid());

-- ============ ADMIN MODERATION OF PROFILES / PROPERTIES ============
DROP POLICY IF EXISTS "admins moderate profiles" ON public.profiles;
CREATE POLICY "admins moderate profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "admins moderate properties" ON public.properties;
CREATE POLICY "admins moderate properties" ON public.properties
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- ============ PRIVATE HELPERS ============
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_blocked_between(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = _a AND blocked_id = _b) OR (blocker_id = _b AND blocked_id = _a)
  );
$$;

CREATE OR REPLACE FUNCTION private.is_restricted(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user
      AND account_status <> 'active'
      AND (suspended_until IS NULL OR suspended_until > now())
  );
$$;

REVOKE ALL ON FUNCTION private.is_blocked_between(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_restricted(uuid) FROM PUBLIC;

-- readable wrappers for the app
CREATE OR REPLACE FUNCTION public.is_blocked_with(_other uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT private.is_blocked_between(auth.uid(), _other);
$$;

CREATE OR REPLACE FUNCTION public.my_account_status()
RETURNS TABLE(status public.account_status, reason text, until timestamptz)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT account_status, suspension_reason, suspended_until
  FROM public.profiles WHERE id = auth.uid();
$$;

-- ============ ENFORCEMENT TRIGGERS ============
CREATE OR REPLACE FUNCTION public.tg_guard_conversation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF private.is_restricted(NEW.buyer_id) THEN
    RAISE EXCEPTION 'ACCOUNT_RESTRICTED';
  END IF;
  IF private.is_blocked_between(NEW.buyer_id, NEW.owner_id) THEN
    RAISE EXCEPTION 'USER_BLOCKED';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_conversation ON public.conversations;
CREATE TRIGGER guard_conversation BEFORE INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_conversation();

CREATE OR REPLACE FUNCTION public.tg_guard_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE c RECORD; v_other uuid;
BEGIN
  SELECT buyer_id, owner_id INTO c FROM public.conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  v_other := CASE WHEN NEW.sender_id = c.buyer_id THEN c.owner_id ELSE c.buyer_id END;
  IF private.is_restricted(NEW.sender_id) THEN RAISE EXCEPTION 'ACCOUNT_RESTRICTED'; END IF;
  IF private.is_blocked_between(NEW.sender_id, v_other) THEN RAISE EXCEPTION 'USER_BLOCKED'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_message ON public.messages;
CREATE TRIGGER guard_message BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_message();

CREATE OR REPLACE FUNCTION public.tg_guard_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_owner uuid;
BEGIN
  SELECT owner_id INTO v_owner FROM public.properties WHERE id = NEW.property_id;
  IF private.is_restricted(NEW.buyer_id) THEN RAISE EXCEPTION 'ACCOUNT_RESTRICTED'; END IF;
  IF v_owner IS NOT NULL AND private.is_blocked_between(NEW.buyer_id, v_owner) THEN
    RAISE EXCEPTION 'USER_BLOCKED';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_booking ON public.bookings;
CREATE TRIGGER guard_booking BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_booking();

CREATE OR REPLACE FUNCTION public.tg_guard_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NEW.visitor_id IS NOT NULL THEN
    IF private.is_restricted(NEW.visitor_id) THEN RAISE EXCEPTION 'ACCOUNT_RESTRICTED'; END IF;
    IF NEW.owner_id IS NOT NULL AND private.is_blocked_between(NEW.visitor_id, NEW.owner_id) THEN
      RAISE EXCEPTION 'USER_BLOCKED';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_lead ON public.leads;
CREATE TRIGGER guard_lead BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_lead();

CREATE OR REPLACE FUNCTION public.tg_guard_property()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF private.is_restricted(NEW.owner_id) THEN RAISE EXCEPTION 'ACCOUNT_RESTRICTED'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_property ON public.properties;
CREATE TRIGGER guard_property BEFORE INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.tg_guard_property();

-- ============ REPORT PRIORITY + NOTIFICATIONS ============
CREATE OR REPLACE FUNCTION public.tg_report_submitted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a RECORD; v_count int := 0;
BEGIN
  IF NEW.reason IN ('fraud','suspicious_payment','threats','identity_concern','fake_account') THEN
    NEW.priority := 'urgent';
  ELSIF NEW.reason IN ('suspicious_activity','harassment','fake_listing') THEN
    NEW.priority := 'high';
  END IF;

  IF NEW.reported_user_id IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM public.safety_reports
      WHERE reported_user_id = NEW.reported_user_id AND status IN ('new','under_review','more_info');
    IF v_count >= 2 THEN NEW.priority := 'urgent'; END IF;
  ELSIF NEW.property_id IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM public.safety_reports
      WHERE property_id = NEW.property_id AND status IN ('new','under_review','more_info');
    IF v_count >= 2 AND NEW.priority = 'normal' THEN NEW.priority := 'high'; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS report_submitted ON public.safety_reports;
CREATE TRIGGER report_submitted BEFORE INSERT ON public.safety_reports
  FOR EACH ROW EXECUTE FUNCTION public.tg_report_submitted();

CREATE OR REPLACE FUNCTION public.tg_report_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a RECORD;
BEGIN
  INSERT INTO public.report_actions(report_id, actor_id, action, to_status)
    VALUES (NEW.id, NEW.reporter_id, 'submitted', NEW.status);

  INSERT INTO public.notifications(user_id, kind, title, body, link, data)
  VALUES (NEW.reporter_id, 'report_received', 'Report received',
          'Thank you. Our trust & safety team is reviewing report ' || NEW.reference || '.',
          '/safety', jsonb_build_object('report_id', NEW.id, 'reference', NEW.reference));

  FOR a IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','super_admin') LOOP
    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (a.user_id, 'report_queue',
            CASE WHEN NEW.priority = 'urgent' THEN 'Urgent report received' ELSE 'New safety report' END,
            'Report ' || NEW.reference || ' — ' || replace(NEW.reason,'_',' '),
            '/admin/safety', jsonb_build_object('report_id', NEW.id, 'priority', NEW.priority));
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS report_after_insert ON public.safety_reports;
CREATE TRIGGER report_after_insert AFTER INSERT ON public.safety_reports
  FOR EACH ROW EXECUTE FUNCTION public.tg_report_after_insert();

CREATE OR REPLACE FUNCTION public.tg_report_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text;
BEGIN
  NEW.updated_at := now();
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('resolved','dismissed') AND NEW.resolved_at IS NULL THEN
      NEW.resolved_at := now();
    END IF;
    INSERT INTO public.report_actions(report_id, actor_id, action, from_status, to_status, note)
      VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status, NEW.status, NEW.resolution);

    v_title := CASE NEW.status
      WHEN 'under_review' THEN 'Your report is being reviewed'
      WHEN 'more_info'    THEN 'More information required'
      WHEN 'resolved'     THEN 'Your report has been resolved'
      WHEN 'dismissed'    THEN 'Your report has been closed'
      ELSE 'Report updated' END;

    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (NEW.reporter_id, 'report_status', v_title,
            COALESCE(NEW.resolution, 'Report ' || NEW.reference || ' was updated.'),
            '/safety', jsonb_build_object('report_id', NEW.id, 'status', NEW.status));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS report_status_change ON public.safety_reports;
CREATE TRIGGER report_status_change BEFORE UPDATE ON public.safety_reports
  FOR EACH ROW EXECUTE FUNCTION public.tg_report_status_change();

-- account suspension notice
CREATE OR REPLACE FUNCTION public.tg_account_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (NEW.id, 'account_status',
            CASE NEW.account_status
              WHEN 'suspended' THEN 'Your account has been suspended'
              WHEN 'banned'    THEN 'Your account has been closed'
              ELSE 'Your account has been restored' END,
            COALESCE(NEW.suspension_reason, 'Contact SPACES support for more information.'),
            '/safety', jsonb_build_object('status', NEW.account_status));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS account_status_change ON public.profiles;
CREATE TRIGGER account_status_change BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_account_status_change();

-- listing under review notice
CREATE OR REPLACE FUNCTION public.tg_property_under_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.under_review IS DISTINCT FROM OLD.under_review THEN
    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (NEW.owner_id, 'listing_moderation',
            CASE WHEN NEW.under_review THEN 'Your listing is under review' ELSE 'Your listing is live again' END,
            COALESCE(NEW.under_review_reason,
              CASE WHEN NEW.under_review THEN 'It is temporarily hidden from search while we investigate.'
                   ELSE 'The review is complete and your listing is visible again.' END),
            '/dashboard/properties', jsonb_build_object('property_id', NEW.id));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS property_under_review ON public.properties;
CREATE TRIGGER property_under_review BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.tg_property_under_review();

-- ============ BACKFILL FROM LEGACY property_reports ============
INSERT INTO public.safety_reports (target_type, property_id, reporter_id, reason, description, status, created_at)
SELECT 'property', pr.property_id, pr.reporter_id, pr.reason, pr.details,
       CASE WHEN pr.status = 'open' THEN 'new'::public.report_status ELSE 'resolved'::public.report_status END,
       pr.created_at
FROM public.property_reports pr
WHERE pr.reporter_id IS NOT NULL
ON CONFLICT DO NOTHING;
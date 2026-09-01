-- ============================================================
-- 1. Soft-delete columns
-- ============================================================
ALTER TABLE public.properties      ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid, ADD COLUMN IF NOT EXISTS delete_reason text;
ALTER TABLE public.leads           ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid, ADD COLUMN IF NOT EXISTS delete_reason text;
ALTER TABLE public.deals           ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid, ADD COLUMN IF NOT EXISTS delete_reason text;
ALTER TABLE public.bookings        ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid, ADD COLUMN IF NOT EXISTS delete_reason text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid, ADD COLUMN IF NOT EXISTS delete_reason text;
ALTER TABLE public.safety_reports  ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid, ADD COLUMN IF NOT EXISTS delete_reason text;
ALTER TABLE public.reviews         ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid, ADD COLUMN IF NOT EXISTS delete_reason text;

CREATE INDEX IF NOT EXISTS idx_properties_deleted_at ON public.properties(deleted_at);
CREATE INDEX IF NOT EXISTS idx_leads_deleted_at ON public.leads(deleted_at);
CREATE INDEX IF NOT EXISTS idx_deals_deleted_at ON public.deals(deleted_at);
CREATE INDEX IF NOT EXISTS idx_bookings_deleted_at ON public.bookings(deleted_at);

-- ============================================================
-- 2. Referential safety: business history must survive a parent delete
-- ============================================================
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_property_id_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE RESTRICT;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_property_id_fkey;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE RESTRICT;

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_property_id_fkey;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE RESTRICT;

ALTER TABLE public.property_promotions DROP CONSTRAINT IF EXISTS property_promotions_property_id_fkey;
ALTER TABLE public.property_promotions ADD CONSTRAINT property_promotions_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE RESTRICT;

ALTER TABLE public.safety_reports DROP CONSTRAINT IF EXISTS safety_reports_property_id_fkey;
ALTER TABLE public.safety_reports ADD CONSTRAINT safety_reports_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

ALTER TABLE public.property_reports DROP CONSTRAINT IF EXISTS property_reports_property_id_fkey;
ALTER TABLE public.property_reports ADD CONSTRAINT property_reports_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE RESTRICT;

-- ============================================================
-- 3. No hard deletes of business records by ordinary users
-- ============================================================
DROP POLICY IF EXISTS "Owners can delete their properties" ON public.properties;
DROP POLICY IF EXISTS "Owners delete own properties" ON public.properties;
DROP POLICY IF EXISTS "properties_delete_own" ON public.properties;
DROP POLICY IF EXISTS "Owners can delete their leads" ON public.leads;
DROP POLICY IF EXISTS "leads_delete_own" ON public.leads;
DROP POLICY IF EXISTS "deals_delete_own" ON public.deals;
DROP POLICY IF EXISTS "Owners can delete deals" ON public.deals;
DROP POLICY IF EXISTS "bookings_delete_own" ON public.bookings;
DROP POLICY IF EXISTS "Participants can delete bookings" ON public.bookings;

REVOKE DELETE ON public.properties, public.leads, public.deals, public.bookings,
                 public.reviews, public.safety_reports, public.support_tickets
  FROM authenticated;

-- ============================================================
-- 4. Safe archive / restore for a Space (atomic, keeps history)
-- ============================================================
CREATE OR REPLACE FUNCTION private.archive_property(_property_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_prop public.properties%ROWTYPE;
  v_is_admin boolean;
  v_deals int;
  v_payments int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT * INTO v_prop FROM public.properties WHERE id = _property_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  v_is_admin := public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin');
  IF NOT v_is_admin AND v_prop.owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  SELECT count(*) INTO v_deals FROM public.deals WHERE property_id = _property_id AND stage = 'completed';
  SELECT count(*) INTO v_payments FROM public.property_promotions WHERE property_id = _property_id;

  UPDATE public.properties
     SET status = 'archived',
         deleted_at = now(),
         deleted_by = auth.uid(),
         delete_reason = NULLIF(btrim(COALESCE(_reason,'')),''),
         updated_at = now()
   WHERE id = _property_id;

  RETURN jsonb_build_object(
    'property_id', _property_id,
    'retained_deals', v_deals,
    'retained_billing_records', v_payments
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.restore_property(_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_owner uuid;
BEGIN
  SELECT owner_id INTO v_owner FROM public.properties WHERE id = _property_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR v_owner = auth.uid()) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  UPDATE public.properties
     SET status = 'paused', deleted_at = NULL, deleted_by = NULL, delete_reason = NULL, updated_at = now()
   WHERE id = _property_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_property(_property_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = public, private
AS $$ SELECT private.archive_property(_property_id, _reason); $$;

CREATE OR REPLACE FUNCTION public.restore_property(_property_id uuid)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = public, private
AS $$ SELECT private.restore_property(_property_id); $$;

REVOKE ALL ON FUNCTION private.archive_property(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.restore_property(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.archive_property(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_property(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.archive_property(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.restore_property(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_property(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_property(uuid) TO authenticated;

-- ============================================================
-- 5. Admin settings (backup configuration, recovery contacts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read settings" ON public.admin_settings;
CREATE POLICY "Admins read settings" ON public.admin_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins write settings" ON public.admin_settings;
CREATE POLICY "Admins write settings" ON public.admin_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Admins update settings" ON public.admin_settings;
CREATE POLICY "Admins update settings" ON public.admin_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

DROP TRIGGER IF EXISTS trg_admin_settings_updated ON public.admin_settings;
CREATE TRIGGER trg_admin_settings_updated BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- 6. Automatic audit trail into the existing Admin Activity Log
-- ============================================================
CREATE OR REPLACE FUNCTION private.audit_log(_action text, _target_type text, _target_id uuid, _label text, _reason text, _meta jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.admin_actions(admin_id, action, target_type, target_id, target_label, reason, meta)
  VALUES (auth.uid(), _action, _target_type, _target_id, _label, _reason, COALESCE(_meta,'{}'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION private.audit_log(text, text, uuid, text, text, jsonb) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.tg_audit_property()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    PERFORM private.audit_log('property_archived','property',NEW.id,NEW.title,NEW.delete_reason,'{}'::jsonb);
  ELSIF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
    PERFORM private.audit_log('property_restored','property',NEW.id,NEW.title,NULL,'{}'::jsonb);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM private.audit_log('property_status_changed','property',NEW.id,NEW.title,
      COALESCE(NEW.rejection_reason, NEW.under_review_reason),
      jsonb_build_object('from',OLD.status,'to',NEW.status));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tg_audit_property() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_audit_property ON public.properties;
CREATE TRIGGER trg_audit_property AFTER UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_property();

CREATE OR REPLACE FUNCTION public.tg_audit_deal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    PERFORM private.audit_log('deal_stage_changed','deal',NEW.id,NEW.reference,NEW.cancel_reason,
      jsonb_build_object('from',OLD.stage,'to',NEW.stage));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tg_audit_deal() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_audit_deal ON public.deals;
CREATE TRIGGER trg_audit_deal AFTER UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_deal();

CREATE OR REPLACE FUNCTION public.tg_audit_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM private.audit_log('payment_status_changed','payment',NEW.id,NEW.reference,NULL,
      jsonb_build_object('from',OLD.status,'to',NEW.status,'purpose',NEW.purpose));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tg_audit_payment() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_audit_payment ON public.payments;
CREATE TRIGGER trg_audit_payment AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_payment();

CREATE OR REPLACE FUNCTION public.tg_audit_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('removed','flagged') THEN
    PERFORM private.audit_log('review_' || NEW.status::text,'review',NEW.id,NULL,NEW.status_reason,'{}'::jsonb);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tg_audit_review() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_audit_review ON public.reviews;
CREATE TRIGGER trg_audit_review AFTER UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_review();

CREATE OR REPLACE FUNCTION public.tg_audit_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM private.audit_log('report_' || NEW.status::text,'report',NEW.id,NEW.reference,NEW.resolution,
      jsonb_build_object('from',OLD.status,'to',NEW.status));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tg_audit_report() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_audit_report ON public.safety_reports;
CREATE TRIGGER trg_audit_report AFTER UPDATE ON public.safety_reports
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_report();

CREATE OR REPLACE FUNCTION public.tg_audit_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM private.audit_log('verification_' || NEW.status,'verification',NEW.id,NEW.subject_type,NEW.review_reason,
      jsonb_build_object('from',OLD.status,'to',NEW.status));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tg_audit_verification() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_audit_verification ON public.verification_requests;
CREATE TRIGGER trg_audit_verification AFTER UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_verification();

CREATE OR REPLACE FUNCTION public.tg_audit_setting()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  PERFORM private.audit_log('admin_setting_changed','setting',NULL,NEW.key,NULL,jsonb_build_object('key',NEW.key));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tg_audit_setting() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_audit_setting ON public.admin_settings;
CREATE TRIGGER trg_audit_setting AFTER INSERT OR UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_setting();
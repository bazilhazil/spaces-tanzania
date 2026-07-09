
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.deal_stage AS ENUM (
    'new_inquiry','contacted','viewing_scheduled','viewing_completed',
    'negotiation','offer_made','offer_accepted','agreement_signed',
    'completed','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.deal_priority AS ENUM ('low','medium','high','urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.deal_health AS ENUM ('healthy','waiting','at_risk','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.deal_activity_kind AS ENUM (
    'lead_created','message_sent','call_made','viewing_scheduled','viewing_completed',
    'stage_changed','note_added','document_uploaded','agent_assigned',
    'offer_made','offer_accepted','offer_rejected','follow_up_scheduled',
    'deal_completed','deal_cancelled','reminder'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.deal_document_kind AS ENUM (
    'offer_letter','lease_agreement','sale_agreement','inspection_report',
    'ownership_document','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ deals ============
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE DEFAULT ('SPD-' || to_char(now(),'YY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name TEXT,
  buyer_phone TEXT,
  buyer_email TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stage public.deal_stage NOT NULL DEFAULT 'new_inquiry',
  priority public.deal_priority NOT NULL DEFAULT 'medium',
  health public.deal_health NOT NULL DEFAULT 'healthy',
  value NUMERIC(14,2),
  currency TEXT NOT NULL DEFAULT 'TZS',
  expected_close_at DATE,
  next_follow_up_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  cancel_reason TEXT,
  kanban_position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deals_stage_idx ON public.deals(stage);
CREATE INDEX IF NOT EXISTS deals_owner_idx ON public.deals(owner_id);
CREATE INDEX IF NOT EXISTS deals_agent_idx ON public.deals(agent_id);
CREATE INDEX IF NOT EXISTS deals_buyer_idx ON public.deals(buyer_id);
CREATE INDEX IF NOT EXISTS deals_property_idx ON public.deals(property_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deals participants can view" ON public.deals;
CREATE POLICY "Deals participants can view" ON public.deals FOR SELECT TO authenticated
USING (
  buyer_id = auth.uid()
  OR owner_id = auth.uid()
  OR agent_id = auth.uid()
  OR public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'super_admin')
);
DROP POLICY IF EXISTS "Deals owner/agent/admin update" ON public.deals;
CREATE POLICY "Deals owner/agent/admin update" ON public.deals FOR UPDATE TO authenticated
USING (
  owner_id = auth.uid() OR agent_id = auth.uid()
  OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
) WITH CHECK (
  owner_id = auth.uid() OR agent_id = auth.uid()
  OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
);
DROP POLICY IF EXISTS "Deals insert by participants" ON public.deals;
CREATE POLICY "Deals insert by participants" ON public.deals FOR INSERT TO authenticated
WITH CHECK (
  owner_id = auth.uid() OR agent_id = auth.uid() OR buyer_id = auth.uid()
  OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
);
DROP POLICY IF EXISTS "Deals delete by owner/admin" ON public.deals;
CREATE POLICY "Deals delete by owner/admin" ON public.deals FOR DELETE TO authenticated
USING (
  owner_id = auth.uid()
  OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
);

-- ============ deal_activities ============
CREATE TABLE IF NOT EXISTS public.deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  kind public.deal_activity_kind NOT NULL,
  label TEXT NOT NULL,
  detail TEXT,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deal_activities_deal_idx ON public.deal_activities(deal_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_activities TO authenticated;
GRANT ALL ON public.deal_activities TO service_role;
ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deal activities visible to deal participants" ON public.deal_activities;
CREATE POLICY "Deal activities visible to deal participants" ON public.deal_activities FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (
    d.buyer_id = auth.uid() OR d.owner_id = auth.uid() OR d.agent_id = auth.uid()
    OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
  )
));
DROP POLICY IF EXISTS "Deal activities insert by participants" ON public.deal_activities;
CREATE POLICY "Deal activities insert by participants" ON public.deal_activities FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (
    d.buyer_id = auth.uid() OR d.owner_id = auth.uid() OR d.agent_id = auth.uid()
    OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
  )
));

-- ============ deal_documents ============
CREATE TABLE IF NOT EXISTS public.deal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  kind public.deal_document_kind NOT NULL DEFAULT 'other',
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deal_documents_deal_idx ON public.deal_documents(deal_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_documents TO authenticated;
GRANT ALL ON public.deal_documents TO service_role;
ALTER TABLE public.deal_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deal documents visible to deal participants" ON public.deal_documents;
CREATE POLICY "Deal documents visible to deal participants" ON public.deal_documents FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (
    d.buyer_id = auth.uid() OR d.owner_id = auth.uid() OR d.agent_id = auth.uid()
    OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
  )
));
DROP POLICY IF EXISTS "Deal documents insert by participants" ON public.deal_documents;
CREATE POLICY "Deal documents insert by participants" ON public.deal_documents FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (
    d.buyer_id = auth.uid() OR d.owner_id = auth.uid() OR d.agent_id = auth.uid()
    OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
  )
));
DROP POLICY IF EXISTS "Deal documents delete by uploader or admin" ON public.deal_documents;
CREATE POLICY "Deal documents delete by uploader or admin" ON public.deal_documents FOR DELETE TO authenticated
USING (
  uploaded_by = auth.uid()
  OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
);

-- updated_at trigger
DROP TRIGGER IF EXISTS deals_set_updated_at ON public.deals;
CREATE TRIGGER deals_set_updated_at BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ Automations ============

-- 1. New conversation → create deal if none exists for (property, buyer)
CREATE OR REPLACE FUNCTION public.tg_conversation_create_deal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner UUID;
  v_price NUMERIC;
  v_currency TEXT;
  v_buyer_name TEXT;
  v_buyer_email TEXT;
  v_deal_id UUID;
BEGIN
  IF NEW.property_id IS NULL OR NEW.buyer_id IS NULL THEN RETURN NEW; END IF;
  -- skip if a deal for (buyer, property) already exists
  SELECT id INTO v_deal_id FROM public.deals
    WHERE property_id = NEW.property_id AND buyer_id = NEW.buyer_id LIMIT 1;
  IF v_deal_id IS NOT NULL THEN RETURN NEW; END IF;

  SELECT owner_id, price, currency INTO v_owner, v_price, v_currency
    FROM public.properties WHERE id = NEW.property_id;
  SELECT full_name, email INTO v_buyer_name, v_buyer_email
    FROM public.profiles WHERE id = NEW.buyer_id;

  INSERT INTO public.deals(
    property_id, conversation_id, buyer_id, buyer_name, buyer_email,
    owner_id, stage, value, currency
  ) VALUES (
    NEW.property_id, NEW.id, NEW.buyer_id, v_buyer_name, v_buyer_email,
    v_owner, 'new_inquiry', v_price, COALESCE(v_currency,'TZS')
  ) RETURNING id INTO v_deal_id;

  INSERT INTO public.deal_activities(deal_id, kind, label, detail, actor_id)
    VALUES (v_deal_id, 'lead_created', 'Lead created', 'New inquiry from buyer', NEW.buyer_id);

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS conversation_create_deal ON public.conversations;
CREATE TRIGGER conversation_create_deal AFTER INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.tg_conversation_create_deal();

-- 2. New message on conversation → touch deal & log
CREATE OR REPLACE FUNCTION public.tg_message_touch_deal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_deal_id UUID;
BEGIN
  SELECT id INTO v_deal_id FROM public.deals WHERE conversation_id = NEW.conversation_id LIMIT 1;
  IF v_deal_id IS NULL THEN RETURN NEW; END IF;
  UPDATE public.deals SET last_activity_at = now() WHERE id = v_deal_id;
  INSERT INTO public.deal_activities(deal_id, kind, label, actor_id)
    VALUES (v_deal_id, 'message_sent', 'Message sent', NEW.sender_id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS message_touch_deal ON public.messages;
CREATE TRIGGER message_touch_deal AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_message_touch_deal();

-- 3. New booking (viewing) → log & advance
CREATE OR REPLACE FUNCTION public.tg_booking_log_deal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_deal_id UUID;
BEGIN
  SELECT id INTO v_deal_id FROM public.deals
    WHERE property_id = NEW.property_id AND buyer_id = NEW.buyer_id
    ORDER BY created_at DESC LIMIT 1;
  IF v_deal_id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.deal_activities(deal_id, kind, label, actor_id)
    VALUES (v_deal_id, 'viewing_scheduled', 'Viewing scheduled', NEW.buyer_id);
  UPDATE public.deals
    SET stage = CASE WHEN stage IN ('new_inquiry','contacted')
                     THEN 'viewing_scheduled'::deal_stage ELSE stage END,
        last_activity_at = now()
    WHERE id = v_deal_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS booking_log_deal ON public.bookings;
CREATE TRIGGER booking_log_deal AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.tg_booking_log_deal();

-- 4. Stage change → log + notify participants
CREATE OR REPLACE FUNCTION public.tg_deal_stage_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_label TEXT;
  v_notif JSONB;
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    v_label := 'Stage changed to ' || replace(NEW.stage::text,'_',' ');
    INSERT INTO public.deal_activities(deal_id, kind, label, detail, actor_id, meta)
      VALUES (NEW.id, 'stage_changed', v_label,
              'From ' || replace(OLD.stage::text,'_',' '),
              auth.uid(),
              jsonb_build_object('from', OLD.stage, 'to', NEW.stage));
    NEW.last_activity_at := now();
    IF NEW.stage = 'completed' THEN NEW.health := 'closed'; END IF;
    IF NEW.stage = 'cancelled' THEN NEW.health := 'closed'; END IF;

    v_notif := jsonb_build_object('deal_id', NEW.id, 'reference', NEW.reference,
                                  'stage', NEW.stage);
    -- notify participants
    IF NEW.buyer_id IS NOT NULL AND NEW.buyer_id <> COALESCE(auth.uid(),'00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.notifications(user_id, kind, title, body, data)
      VALUES (NEW.buyer_id, 'deal_stage', v_label, 'Deal ' || NEW.reference, v_notif);
    END IF;
    IF NEW.owner_id IS NOT NULL AND NEW.owner_id <> COALESCE(auth.uid(),'00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.notifications(user_id, kind, title, body, data)
      VALUES (NEW.owner_id, 'deal_stage', v_label, 'Deal ' || NEW.reference, v_notif);
    END IF;
    IF NEW.agent_id IS NOT NULL AND NEW.agent_id <> COALESCE(auth.uid(),'00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.notifications(user_id, kind, title, body, data)
      VALUES (NEW.agent_id, 'deal_stage', v_label, 'Deal ' || NEW.reference, v_notif);
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS deal_stage_change ON public.deals;
CREATE TRIGGER deal_stage_change BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.tg_deal_stage_change();

-- 5. Health recompute helper (called by app or cron)
CREATE OR REPLACE FUNCTION public.recompute_deal_health(_deal_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  SELECT * INTO r FROM public.deals WHERE id = _deal_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF r.stage IN ('completed','cancelled') THEN
    UPDATE public.deals SET health='closed' WHERE id=_deal_id; RETURN;
  END IF;
  IF r.next_follow_up_at IS NOT NULL AND r.next_follow_up_at < now() - INTERVAL '1 day' THEN
    UPDATE public.deals SET health='at_risk' WHERE id=_deal_id; RETURN;
  END IF;
  IF r.last_activity_at < now() - INTERVAL '7 days' THEN
    UPDATE public.deals SET health='at_risk' WHERE id=_deal_id; RETURN;
  END IF;
  IF r.last_activity_at < now() - INTERVAL '3 days' THEN
    UPDATE public.deals SET health='waiting' WHERE id=_deal_id; RETURN;
  END IF;
  UPDATE public.deals SET health='healthy' WHERE id=_deal_id;
END; $$;

-- Realtime for kanban live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_activities;

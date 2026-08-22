ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS recipient_id uuid,
  ADD COLUMN IF NOT EXISTS buyer_name text,
  ADD COLUMN IF NOT EXISTS buyer_email text,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS suggested_at timestamptz,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL;

ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'pending';
UPDATE public.bookings SET status = 'pending' WHERE status = 'requested';
UPDATE public.bookings SET recipient_id = COALESCE(agent_id, owner_id) WHERE recipient_id IS NULL;

CREATE INDEX IF NOT EXISTS bookings_recipient_idx ON public.bookings(recipient_id);
CREATE INDEX IF NOT EXISTS bookings_buyer_idx ON public.bookings(buyer_id);

DROP POLICY IF EXISTS "participants read bookings" ON public.bookings;
CREATE POLICY "participants read bookings"
ON public.bookings FOR SELECT TO authenticated
USING (
  auth.uid() = buyer_id
  OR auth.uid() = owner_id
  OR auth.uid() = agent_id
  OR auth.uid() = recipient_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "participants update booking" ON public.bookings;
CREATE POLICY "participants update booking"
ON public.bookings FOR UPDATE TO authenticated
USING (
  auth.uid() = buyer_id
  OR auth.uid() = owner_id
  OR auth.uid() = agent_id
  OR auth.uid() = recipient_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  auth.uid() = buyer_id
  OR auth.uid() = owner_id
  OR auth.uid() = agent_id
  OR auth.uid() = recipient_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Route a new viewing request to the right recipient, create/attach the lead,
-- link the deal and notify the owner/agent.
CREATE OR REPLACE FUNCTION public.tg_booking_route_and_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prop RECORD;
  v_lead_id uuid;
  v_deal_id uuid;
  v_title text;
BEGIN
  SELECT id, owner_id, title INTO v_prop FROM public.properties WHERE id = NEW.property_id;
  v_title := COALESCE(v_prop.title, 'a property');

  IF NEW.owner_id IS NULL THEN NEW.owner_id := v_prop.owner_id; END IF;
  IF NEW.recipient_id IS NULL THEN NEW.recipient_id := COALESCE(NEW.agent_id, NEW.owner_id); END IF;
  IF NEW.status IS NULL OR NEW.status = 'requested' THEN NEW.status := 'pending'; END IF;

  IF NEW.buyer_name IS NULL OR NEW.buyer_email IS NULL THEN
    SELECT COALESCE(NEW.buyer_name, full_name), COALESCE(NEW.buyer_email, email)
      INTO NEW.buyer_name, NEW.buyer_email
      FROM public.profiles WHERE id = NEW.buyer_id;
  END IF;

  -- Lead: reuse the most recent one for this buyer+property, else create it.
  IF NEW.lead_id IS NULL THEN
    SELECT id INTO v_lead_id FROM public.leads
      WHERE property_id = NEW.property_id AND visitor_id = NEW.buyer_id
      ORDER BY created_at DESC LIMIT 1;
    IF v_lead_id IS NULL THEN
      INSERT INTO public.leads (property_id, owner_id, visitor_id, visitor_name, visitor_phone,
                                visitor_email, contact_method, message, status)
      VALUES (NEW.property_id, COALESCE(NEW.recipient_id, v_prop.owner_id), NEW.buyer_id,
              NEW.buyer_name, NEW.contact_phone, NEW.buyer_email, 'viewing',
              COALESCE(NEW.message, 'Viewing requested'), 'new')
      RETURNING id INTO v_lead_id;
    END IF;
    NEW.lead_id := v_lead_id;
  END IF;

  -- Deal: attach when one already exists for this buyer + property.
  IF NEW.deal_id IS NULL THEN
    SELECT id INTO v_deal_id FROM public.deals
      WHERE property_id = NEW.property_id AND buyer_id = NEW.buyer_id
      ORDER BY created_at DESC LIMIT 1;
    NEW.deal_id := v_deal_id;
  END IF;

  IF NEW.recipient_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link, data)
    VALUES (NEW.recipient_id, 'viewing_requested', 'New viewing request',
            COALESCE(NEW.buyer_name, 'A buyer') || ' requested a viewing for ' || v_title,
            '/viewings',
            jsonb_build_object('booking_id', NEW.id, 'property_id', NEW.property_id));
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS booking_route_and_notify ON public.bookings;
CREATE TRIGGER booking_route_and_notify
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_booking_route_and_notify();

-- Keep both sides in sync on status changes.
CREATE OR REPLACE FUNCTION public.tg_booking_status_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_label text;
  v_target uuid;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  SELECT title INTO v_title FROM public.properties WHERE id = NEW.property_id;
  v_label := CASE NEW.status
    WHEN 'approved' THEN 'Viewing approved'
    WHEN 'rejected' THEN 'Viewing declined'
    WHEN 'rescheduled' THEN 'New viewing time suggested'
    WHEN 'cancelled' THEN 'Viewing cancelled'
    WHEN 'completed' THEN 'Viewing completed'
    ELSE 'Viewing updated' END;

  -- notify the party that did not make the change
  v_target := CASE WHEN auth.uid() = NEW.buyer_id THEN NEW.recipient_id ELSE NEW.buyer_id END;
  IF v_target IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link, data)
    VALUES (v_target, 'viewing_status', v_label,
            COALESCE(v_title, 'Property') || ' — ' || v_label, '/viewings',
            jsonb_build_object('booking_id', NEW.id, 'property_id', NEW.property_id, 'status', NEW.status));
  END IF;

  IF NEW.deal_id IS NOT NULL THEN
    INSERT INTO public.deal_activities (deal_id, kind, label, detail, actor_id)
    VALUES (NEW.deal_id,
            CASE WHEN NEW.status = 'completed' THEN 'viewing_completed'::deal_activity_kind
                 ELSE 'viewing_scheduled'::deal_activity_kind END,
            v_label, COALESCE(v_title, ''), auth.uid());
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS booking_status_sync ON public.bookings;
CREATE TRIGGER booking_status_sync
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_booking_status_sync();

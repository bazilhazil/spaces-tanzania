-- 1) Stable dedupe reference on the existing notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE INDEX IF NOT EXISTS notifications_user_dedupe_idx ON public.notifications (user_id, dedupe_key);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications (user_id) WHERE read_at IS NULL;

-- 2) Per-user delivery preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  in_app boolean NOT NULL DEFAULT true,
  email boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notification prefs select" ON public.notification_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own notification prefs insert" ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notification prefs update" ON public.notification_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3) Kinds that can never be switched off
CREATE OR REPLACE FUNCTION public.notification_is_critical(_kind text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT _kind IN ('account_status','security','verification_status','report_status','listing_moderation','payment_issue');
$$;

-- 4) Single gate for every notification insert: dedupe + preferences
CREATE OR REPLACE FUNCTION public.tg_notification_prepare()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ref text; v_in_app boolean;
BEGIN
  IF NEW.dedupe_key IS NULL THEN
    v_ref := COALESCE(NEW.data->>'booking_id', NEW.data->>'lead_id', NEW.data->>'deal_id',
                      NEW.data->>'report_id', NEW.data->>'request_id', NEW.data->>'review_id',
                      NEW.data->>'ticket_id', NEW.data->>'conversation_id', NEW.data->>'user_id',
                      NEW.data->>'property_id');
    IF v_ref IS NOT NULL THEN
      NEW.dedupe_key := NEW.kind || ':' || v_ref || ':' ||
        COALESCE(NEW.data->>'status', NEW.data->>'stage', NEW.data->>'verification_status', NEW.data->>'scheduled_at', '');
    END IF;
  END IF;

  IF NOT public.notification_is_critical(NEW.kind) THEN
    SELECT in_app INTO v_in_app FROM public.notification_preferences WHERE user_id = NEW.user_id;
    IF v_in_app IS FALSE THEN RETURN NULL; END IF;
  END IF;

  IF NEW.dedupe_key IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text || NEW.dedupe_key));
    IF EXISTS (SELECT 1 FROM public.notifications
               WHERE user_id = NEW.user_id AND dedupe_key = NEW.dedupe_key
                 AND (read_at IS NULL OR created_at > now() - interval '10 minutes')) THEN
      RETURN NULL; -- same event already delivered to this recipient
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS notification_prepare ON public.notifications;
CREATE TRIGGER notification_prepare BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.tg_notification_prepare();

-- 5) New message -> notify the other participant (grouped per conversation while unread)
CREATE OR REPLACE FUNCTION public.tg_message_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_conv RECORD; v_target uuid; v_name text; v_key text; v_existing uuid; v_count int;
BEGIN
  SELECT id, buyer_id, owner_id, property_id INTO v_conv FROM public.conversations WHERE id = NEW.conversation_id;
  IF v_conv.id IS NULL THEN RETURN NEW; END IF;
  v_target := CASE WHEN NEW.sender_id = v_conv.buyer_id THEN v_conv.owner_id ELSE v_conv.buyer_id END;
  IF v_target IS NULL OR v_target = NEW.sender_id THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(full_name,''), 'Someone') INTO v_name FROM public.profiles WHERE id = NEW.sender_id;
  v_name := COALESCE(v_name, 'Someone');
  v_key := 'new_message:' || v_conv.id;

  SELECT id INTO v_existing FROM public.notifications
   WHERE user_id = v_target AND dedupe_key = v_key AND read_at IS NULL
   ORDER BY created_at DESC LIMIT 1;

  IF v_existing IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM public.messages
     WHERE conversation_id = v_conv.id AND sender_id <> v_target AND read_at IS NULL;
    UPDATE public.notifications
       SET body = v_count || ' new messages from ' || v_name,
           data = data || jsonb_build_object('message_id', NEW.id, 'count', v_count),
           created_at = now()
     WHERE id = v_existing;
  ELSE
    INSERT INTO public.notifications (user_id, kind, title, body, link, data, dedupe_key)
    VALUES (v_target, 'new_message', 'New message',
            'You have a new message from ' || v_name,
            '/messages?c=' || v_conv.id,
            jsonb_build_object('conversation_id', v_conv.id, 'message_id', NEW.id,
                               'property_id', v_conv.property_id, 'sender_id', NEW.sender_id, 'count', 1),
            v_key);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS message_notify ON public.messages;
CREATE TRIGGER message_notify AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_message_notify();

-- 6) Viewing time changed without a status change -> notify the other party
CREATE OR REPLACE FUNCTION public.tg_booking_time_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text; v_target uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.scheduled_at IS NOT DISTINCT FROM OLD.scheduled_at
     AND NEW.suggested_at IS NOT DISTINCT FROM OLD.suggested_at THEN RETURN NEW; END IF;
  SELECT title INTO v_title FROM public.properties WHERE id = NEW.property_id;
  v_target := CASE WHEN auth.uid() = NEW.buyer_id THEN NEW.recipient_id ELSE NEW.buyer_id END;
  IF v_target IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, kind, title, body, link, data)
  VALUES (v_target, 'viewing_status', 'Viewing time changed',
          COALESCE(v_title,'Property') || ' — new time ' ||
            to_char(COALESCE(NEW.suggested_at, NEW.scheduled_at) AT TIME ZONE 'Africa/Dar_es_Salaam', 'DD Mon at HH24:MI'),
          '/viewings',
          jsonb_build_object('booking_id', NEW.id, 'property_id', NEW.property_id,
                             'scheduled_at', COALESCE(NEW.suggested_at, NEW.scheduled_at)));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS booking_time_notify ON public.bookings;
CREATE TRIGGER booking_time_notify AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.tg_booking_time_notify();

-- 7) Remove existing exact duplicates (keep the earliest of each)
DELETE FROM public.notifications n USING public.notifications m
 WHERE n.user_id = m.user_id AND n.kind = n.kind AND m.kind = n.kind
   AND n.data = m.data AND n.title = m.title
   AND (n.created_at, n.id) > (m.created_at, m.id);

-- 8) Backfill keys for existing rows
UPDATE public.notifications SET dedupe_key = kind || ':' ||
  COALESCE(data->>'booking_id', data->>'lead_id', data->>'deal_id', data->>'report_id', data->>'request_id',
           data->>'review_id', data->>'ticket_id', data->>'conversation_id', data->>'user_id', data->>'property_id') || ':' ||
  COALESCE(data->>'status', data->>'stage', data->>'verification_status', data->>'scheduled_at', '')
WHERE dedupe_key IS NULL
  AND COALESCE(data->>'booking_id', data->>'lead_id', data->>'deal_id', data->>'report_id', data->>'request_id',
           data->>'review_id', data->>'ticket_id', data->>'conversation_id', data->>'user_id', data->>'property_id') IS NOT NULL;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;


CREATE TYPE public.support_status AS ENUM ('open','in_progress','waiting_user','resolved','closed');
CREATE TYPE public.support_priority AS ENUM ('normal','high','urgent');

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('SUP-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  status public.support_status NOT NULL DEFAULT 'open',
  priority public.support_priority NOT NULL DEFAULT 'normal',
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  assigned_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  closed_at timestamptz,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own tickets select" ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "own tickets insert" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own tickets update" ON public.support_tickets FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE INDEX support_tickets_user_idx ON public.support_tickets(user_id, created_at DESC);
CREATE INDEX support_tickets_status_idx ON public.support_tickets(status, priority, created_at DESC);

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_staff boolean NOT NULL DEFAULT false,
  internal boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  attachment_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket messages select" ON public.support_messages FOR SELECT TO authenticated
  USING (
    (NOT internal AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid()))
    OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
  );
CREATE POLICY "ticket messages insert" ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      (NOT internal AND NOT is_staff AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid()))
      OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
    )
  );

CREATE INDEX support_messages_ticket_idx ON public.support_messages(ticket_id, created_at);

CREATE TABLE public.support_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'other',
  question text NOT NULL,
  answer text NOT NULL,
  question_sw text,
  answer_sw text,
  published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.support_faqs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_faqs TO authenticated;
GRANT ALL ON public.support_faqs TO service_role;
ALTER TABLE public.support_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "published faqs readable" ON public.support_faqs FOR SELECT TO anon, authenticated
  USING (published OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "admins manage faqs insert" ON public.support_faqs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "admins manage faqs update" ON public.support_faqs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "admins manage faqs delete" ON public.support_faqs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER support_faqs_updated_at BEFORE UPDATE ON public.support_faqs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- notifications ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_support_ticket_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, kind, title, body, link, data)
  VALUES (NEW.user_id, 'support_ticket_created', 'Support request received',
          NEW.reference || ' — ' || NEW.subject, '/dashboard/support',
          jsonb_build_object('ticket_id', NEW.id, 'reference', NEW.reference));

  INSERT INTO public.notifications (user_id, kind, title, body, link, data)
  SELECT ur.user_id, 'support_ticket_new', 'New support ticket',
         NEW.reference || ' — ' || NEW.subject, '/admin/support',
         jsonb_build_object('ticket_id', NEW.id, 'reference', NEW.reference)
  FROM public.user_roles ur
  WHERE ur.role IN ('admin','super_admin');
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.tg_support_ticket_created() FROM public, anon, authenticated;

CREATE TRIGGER support_ticket_created AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.tg_support_ticket_created();

CREATE OR REPLACE FUNCTION public.tg_support_message_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.support_tickets;
BEGIN
  SELECT * INTO t FROM public.support_tickets WHERE id = NEW.ticket_id;
  UPDATE public.support_tickets SET last_message_at = NEW.created_at, updated_at = now() WHERE id = NEW.ticket_id;

  IF NEW.internal THEN RETURN NEW; END IF;

  IF NEW.is_staff THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link, data)
    VALUES (t.user_id, 'support_reply', 'Support replied',
            t.reference || ' — ' || t.subject, '/dashboard/support',
            jsonb_build_object('ticket_id', t.id, 'reference', t.reference));
  ELSE
    INSERT INTO public.notifications (user_id, kind, title, body, link, data)
    SELECT COALESCE(t.assigned_admin_id, ur.user_id), 'support_user_reply', 'User replied to ticket',
           t.reference || ' — ' || t.subject, '/admin/support',
           jsonb_build_object('ticket_id', t.id, 'reference', t.reference)
    FROM public.user_roles ur
    WHERE ur.role IN ('admin','super_admin')
      AND (t.assigned_admin_id IS NULL OR ur.user_id = t.assigned_admin_id);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.tg_support_message_notify() FROM public, anon, authenticated;

CREATE TRIGGER support_message_notify AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_support_message_notify();

CREATE OR REPLACE FUNCTION public.tg_support_status_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'resolved' THEN
      NEW.resolved_at := now();
      INSERT INTO public.notifications (user_id, kind, title, body, link, data)
      VALUES (NEW.user_id, 'support_resolved', 'Support request resolved',
              NEW.reference || ' — ' || NEW.subject, '/dashboard/support',
              jsonb_build_object('ticket_id', NEW.id, 'reference', NEW.reference));
    ELSIF NEW.status = 'closed' THEN
      NEW.closed_at := now();
    ELSIF NEW.status = 'waiting_user' THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link, data)
      VALUES (NEW.user_id, 'support_more_info', 'More information needed',
              NEW.reference || ' — ' || NEW.subject, '/dashboard/support',
              jsonb_build_object('ticket_id', NEW.id, 'reference', NEW.reference));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.tg_support_status_notify() FROM public, anon, authenticated;

CREATE TRIGGER support_status_notify BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.tg_support_status_notify();

-- guard: normal users may not escalate priority, reassign or reopen arbitrarily
CREATE OR REPLACE FUNCTION public.tg_support_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') THEN
    RETURN NEW;
  END IF;
  NEW.priority := OLD.priority;
  NEW.assigned_admin_id := OLD.assigned_admin_id;
  NEW.user_id := OLD.user_id;
  NEW.reference := OLD.reference;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'closed' THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.tg_support_guard() FROM public, anon, authenticated;

CREATE TRIGGER support_guard BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.tg_support_guard();

-- storage policies for support attachments
CREATE POLICY "support attachments insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'support' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "support attachments select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'support' AND ((storage.foldername(name))[1] = auth.uid()::text
     OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));

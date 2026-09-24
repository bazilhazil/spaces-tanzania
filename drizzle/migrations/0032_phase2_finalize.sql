
ALTER TYPE public.deal_document_kind ADD VALUE IF NOT EXISTS 'proof_of_funds';
ALTER TYPE public.deal_document_kind ADD VALUE IF NOT EXISTS 'financing_document';
ALTER TYPE public.deal_document_kind ADD VALUE IF NOT EXISTS 'identification';

ALTER TABLE public.deal_documents
  ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'submitted';

-- Snapshots
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS fee_rate_used numeric,
  ADD COLUMN IF NOT EXISTS fee_fixed_used numeric,
  ADD COLUMN IF NOT EXISTS tax_rate_used numeric,
  ADD COLUMN IF NOT EXISTS commission_rule_label text,
  ADD COLUMN IF NOT EXISTS fees_locked_at timestamptz;
ALTER TABLE public.deal_payment_items ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.deal_commissions ADD COLUMN IF NOT EXISTS rule_label text;

INSERT INTO public.admin_settings(key, value) VALUES ('payment_test_mode', '{"enabled": false}'::jsonb) ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.calc_deal_fees(_deal_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.deals%ROWTYPE; r public.pricing_rules%ROWTYPE; c public.pricing_rules%ROWTYPE;
  v_price numeric; v_fee numeric := 0; v_tax numeric := 0; v_comm numeric := 0; v_rate numeric; v_label text;
BEGIN
  SELECT * INTO d FROM public.deals WHERE id=_deal_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  v_price := COALESCE(d.agreed_price, d.value, d.asking_price, 0);
  IF d.fees_locked_at IS NOT NULL THEN
    RETURN jsonb_build_object('price',v_price,'spaces_fee',d.estimated_spaces_fee,'tax',d.spaces_fee_tax,'rule_id',d.spaces_fee_rule_id,
      'percentage',d.fee_rate_used,'commission',d.agent_commission,'commission_rate',d.commission_rate,'locked',true);
  END IF;
  SELECT * INTO r FROM public.pricing_rules
   WHERE rule_type='transaction_fee' AND active AND applies_to IN ('any', COALESCE(d.transaction_type,'sale'))
     AND (effective_from IS NULL OR effective_from <= current_date) AND (effective_to IS NULL OR effective_to >= current_date)
   ORDER BY (applies_to <> 'any') DESC, sort_order, created_at LIMIT 1;
  IF FOUND THEN
    v_fee := COALESCE(v_price * COALESCE(r.percentage,0)/100,0) + COALESCE(r.fixed_amount,0);
    IF r.min_amount IS NOT NULL THEN v_fee := GREATEST(v_fee, r.min_amount); END IF;
    IF r.max_amount IS NOT NULL THEN v_fee := LEAST(v_fee, r.max_amount); END IF;
    v_tax := v_fee * COALESCE(r.tax_rate,0)/100;
  END IF;
  IF d.agent_id IS NOT NULL AND d.agent_id <> COALESCE(d.owner_id,'00000000-0000-0000-0000-000000000000'::uuid) THEN
    SELECT * INTO c FROM public.pricing_rules
     WHERE rule_type='commission' AND active AND applies_to IN ('any', COALESCE(d.transaction_type,'sale'))
       AND (effective_from IS NULL OR effective_from <= current_date) AND (effective_to IS NULL OR effective_to >= current_date)
     ORDER BY (applies_to <> 'any') DESC, sort_order LIMIT 1;
    IF FOUND THEN
      v_rate := c.percentage; v_label := c.name;
      v_comm := COALESCE(v_price*COALESCE(c.percentage,0)/100,0) + COALESCE(c.fixed_amount,0);
      IF c.min_amount IS NOT NULL THEN v_comm := GREATEST(v_comm, c.min_amount); END IF;
      IF c.max_amount IS NOT NULL THEN v_comm := LEAST(v_comm, c.max_amount); END IF;
    ELSE
      SELECT COALESCE((value->>'default_commission_rate')::numeric, 0) INTO v_rate FROM public.admin_settings WHERE key='offer_rules';
      v_label := 'Default commission (Admin setting)';
      v_comm := v_price * COALESCE(v_rate,0)/100;
    END IF;
  END IF;
  UPDATE public.deals SET estimated_spaces_fee=round(v_fee,2), spaces_fee_tax=round(v_tax,2), spaces_fee_rule_id=r.id,
    fee_rate_used=r.percentage, fee_fixed_used=r.fixed_amount, tax_rate_used=r.tax_rate,
    agent_commission=CASE WHEN d.agent_id IS NULL THEN NULL ELSE round(v_comm,2) END, commission_rate=v_rate, commission_rule_id=c.id,
    commission_rule_label=v_label
   WHERE id=_deal_id;
  RETURN jsonb_build_object('price',v_price,'spaces_fee',round(v_fee,2),'tax',round(v_tax,2),'rule_id',r.id,'rule_name',r.name,
    'percentage',r.percentage,'commission',round(v_comm,2),'commission_rate',v_rate,'commission_rule',v_label,'other',d.other_charges,
    'total_charges', round(v_fee+v_tax+v_comm+COALESCE(d.other_charges,0),2));
END $$;
REVOKE ALL ON FUNCTION public.calc_deal_fees(uuid) FROM anon, public, authenticated;

-- lock snapshot once agreement is reached (after accept computes)
CREATE OR REPLACE FUNCTION public.tg_lock_deal_fees() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.fees_locked_at IS NULL AND NEW.agreement_at IS NOT NULL AND NEW.estimated_spaces_fee IS NOT NULL AND OLD.estimated_spaces_fee IS NULL THEN
    NEW.fees_locked_at := now();
  END IF;
  IF OLD.fees_locked_at IS NOT NULL AND auth.uid() IS NOT NULL AND NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
     AND (NEW.estimated_spaces_fee IS DISTINCT FROM OLD.estimated_spaces_fee OR NEW.agent_commission IS DISTINCT FROM OLD.agent_commission
          OR NEW.commission_rate IS DISTINCT FROM OLD.commission_rate OR NEW.fee_rate_used IS DISTINCT FROM OLD.fee_rate_used) THEN
    RAISE EXCEPTION 'Agreed fees and commission are locked. Only SPACES admin can adjust them.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS lock_deal_fees ON public.deals;
CREATE TRIGGER lock_deal_fees BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.tg_lock_deal_fees();

-- commission rule label snapshot
CREATE OR REPLACE FUNCTION public.tg_commission_label() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.rule_label IS NULL THEN SELECT commission_rule_label INTO NEW.rule_label FROM public.deals WHERE id=NEW.deal_id; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS commission_label ON public.deal_commissions;
CREATE TRIGGER commission_label BEFORE INSERT OR UPDATE ON public.deal_commissions FOR EACH ROW EXECUTE FUNCTION public.tg_commission_label();

-- Allow test payments through the paid guard
CREATE OR REPLACE FUNCTION public.tg_guard_deal_payment_item() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    IF NEW.payment_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.id = NEW.payment_id AND p.status IN ('paid','succeeded')) THEN
      RAISE EXCEPTION 'A payment can only be marked paid after a confirmed payment record exists.';
    END IF;
    IF NEW.is_test AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.id=NEW.payment_id AND p.provider='test_mode') THEN
      RAISE EXCEPTION 'Invalid test payment.';
    END IF;
    NEW.paid_at := COALESCE(NEW.paid_at, now());
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.tg_deal_payment_item_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM private.deal_audit(NEW.deal_id, NULL, 'payment_created', NEW.label || ' created', NEW.amount, NULL, NULL, jsonb_build_object('status', NEW.status));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM private.deal_audit(NEW.deal_id, NULL,
      CASE WHEN NEW.status='paid' AND NEW.is_test THEN 'test_payment' WHEN NEW.status='paid' THEN 'payment_confirmed' ELSE 'payment_status' END,
      CASE WHEN NEW.status='paid' AND NEW.is_test THEN NEW.label || ': Test payment — not a real payment' ELSE NEW.label || ': ' || NEW.status END,
      NEW.amount, NULL, jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status, 'test', NEW.is_test));
    IF NEW.status='paid' THEN PERFORM public.advance_deal(NEW.deal_id); END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.payment_test_mode_enabled() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE((SELECT (value->>'enabled')::boolean FROM public.admin_settings WHERE key='payment_test_mode'), false)
     AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
$$;
GRANT EXECUTE ON FUNCTION public.payment_test_mode_enabled() TO authenticated;

CREATE OR REPLACE FUNCTION public.simulate_test_payment(_deal_id uuid) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_pay uuid; n int := 0; it record; d public.deals%ROWTYPE;
BEGIN
  IF NOT public.payment_test_mode_enabled() THEN RAISE EXCEPTION 'Test payment mode is off, or you are not an admin.'; END IF;
  SELECT * INTO d FROM public.deals WHERE id=_deal_id;
  IF d.stage::text <> 'payment' THEN RAISE EXCEPTION 'The deal must be at the payment step.'; END IF;
  FOR it IN SELECT * FROM public.deal_payment_items WHERE deal_id=_deal_id AND status IN ('pending','processing','failed') AND amount > 0 LOOP
    INSERT INTO public.payments(user_id, provider, amount, currency, status, reference, purpose, metadata, paid_at)
    VALUES (auth.uid(), 'test_mode', it.amount, it.currency, 'paid', 'TEST-'||upper(substr(md5(random()::text),1,10)), 'deal_test',
      jsonb_build_object('test', true, 'deal_id', _deal_id, 'item', it.kind, 'note', 'Test payment — not a real payment'), now())
    RETURNING id INTO v_pay;
    UPDATE public.deal_payment_items SET is_test=true, payment_id=v_pay, status='paid' WHERE id=it.id;
    n := n + 1;
  END LOOP;
  PERFORM public.advance_deal(_deal_id);
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.simulate_test_payment(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.simulate_test_payment(uuid) TO authenticated;

-- Admin summary: separate test from real revenue
CREATE OR REPLACE FUNCTION public.admin_deal_summary(_from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN RAISE EXCEPTION 'Admins only.'; END IF;
  SELECT jsonb_build_object(
    'active', count(*) FILTER (WHERE stage::text NOT IN ('completed','cancelled')),
    'offer', count(*) FILTER (WHERE stage::text='offer_made'),
    'negotiation', count(*) FILTER (WHERE stage::text='negotiation'),
    'agreement', count(*) FILTER (WHERE stage::text IN ('offer_accepted','agreement_signed')),
    'verification', count(*) FILTER (WHERE stage::text='verification'),
    'payment', count(*) FILTER (WHERE stage::text='payment'),
    'completed', count(*) FILTER (WHERE stage::text='completed'),
    'cancelled', count(*) FILTER (WHERE stage::text='cancelled'),
    'transaction_value', COALESCE(sum(agreed_price) FILTER (WHERE stage::text <> 'cancelled'),0),
    'estimated_revenue', COALESCE(sum(estimated_spaces_fee) FILTER (WHERE agreed_price IS NOT NULL AND stage::text NOT IN ('cancelled','completed')),0),
    'pending_revenue', COALESCE(sum(estimated_spaces_fee) FILTER (WHERE stage::text='completed' AND NOT EXISTS (
        SELECT 1 FROM public.deal_payment_items p WHERE p.deal_id=deals.id AND p.kind='spaces_fee' AND p.status='paid')),0),
    'agent_commissions', COALESCE(sum(agent_commission) FILTER (WHERE stage::text <> 'cancelled'),0)
  ) INTO r FROM public.deals
   WHERE deleted_at IS NULL AND (_from IS NULL OR created_at >= _from) AND (_to IS NULL OR created_at < _to);
  r := r || jsonb_build_object(
    'offers_today', (SELECT count(*) FROM public.offers WHERE created_at >= date_trunc('day', now())),
    'collected_revenue', (SELECT COALESCE(sum(amount),0) FROM public.deal_payment_items WHERE kind='spaces_fee' AND status='paid' AND NOT is_test),
    'test_collected_revenue', (SELECT COALESCE(sum(amount),0) FROM public.deal_payment_items WHERE kind='spaces_fee' AND status='paid' AND is_test));
  RETURN r;
END $$;

-- Admin deal search with real filters
CREATE OR REPLACE FUNCTION public.admin_search_deals(_from timestamptz, _to timestamptz, _stage text, _region text, _ptype text,
  _agent uuid, _owner uuid, _buyer uuid, _ttype text, _pay text, _avail text)
RETURNS TABLE(id uuid, reference text, stage text, created_at timestamptz, property_title text, region text, district text, property_type text,
  availability text, transaction_type text, agreed_price numeric, value numeric, estimated_spaces_fee numeric, agent_commission numeric,
  owner_name text, agent_name text, buyer_name text, owner_id uuid, agent_id uuid, buyer_id uuid, payment_status text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN RAISE EXCEPTION 'Admins only.'; END IF;
  RETURN QUERY
  SELECT d.id, d.reference, d.stage::text, d.created_at, p.title, p.region, p.district, p.property_type::text, p.availability,
    COALESCE(d.transaction_type, p.listing_type::text), d.agreed_price, d.value, d.estimated_spaces_fee, d.agent_commission,
    po.full_name, pa.full_name, COALESCE(pb.full_name, d.buyer_name), d.owner_id, d.agent_id, d.buyer_id,
    CASE WHEN NOT EXISTS (SELECT 1 FROM deal_payment_items x WHERE x.deal_id=d.id) THEN 'none'
         WHEN NOT EXISTS (SELECT 1 FROM deal_payment_items x WHERE x.deal_id=d.id AND x.status NOT IN ('paid','cancelled')) THEN 'paid'
         WHEN EXISTS (SELECT 1 FROM deal_payment_items x WHERE x.deal_id=d.id AND x.status='failed') THEN 'failed'
         ELSE 'pending' END
  FROM deals d LEFT JOIN properties p ON p.id=d.property_id
  LEFT JOIN profiles po ON po.id=d.owner_id LEFT JOIN profiles pa ON pa.id=d.agent_id LEFT JOIN profiles pb ON pb.id=d.buyer_id
  WHERE d.deleted_at IS NULL
    AND (_from IS NULL OR d.created_at >= _from) AND (_to IS NULL OR d.created_at < _to)
    AND (_stage IS NULL OR d.stage::text=_stage) AND (_region IS NULL OR p.region=_region)
    AND (_ptype IS NULL OR p.property_type::text=_ptype) AND (_agent IS NULL OR d.agent_id=_agent)
    AND (_owner IS NULL OR d.owner_id=_owner) AND (_buyer IS NULL OR d.buyer_id=_buyer)
    AND (_ttype IS NULL OR COALESCE(d.transaction_type,p.listing_type::text)=_ttype) AND (_avail IS NULL OR p.availability=_avail)
  ORDER BY d.created_at DESC LIMIT 500;
END $$;
REVOKE ALL ON FUNCTION public.admin_search_deals(timestamptz,timestamptz,text,text,text,uuid,uuid,uuid,text,text,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_search_deals(timestamptz,timestamptz,text,text,text,uuid,uuid,uuid,text,text,text) TO authenticated;

-- AGENCIES
CREATE TABLE IF NOT EXISTS public.agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 1),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text, email text, region text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.agency_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','declined','removed')),
  invited_by uuid, created_at timestamptz NOT NULL DEFAULT now(), accepted_at timestamptz,
  UNIQUE (agency_id, user_id)
);
CREATE INDEX IF NOT EXISTS agency_members_user_idx ON public.agency_members(user_id, status);
GRANT SELECT, INSERT, UPDATE ON public.agencies TO authenticated;
GRANT SELECT ON public.agency_members TO authenticated;
GRANT ALL ON public.agencies TO service_role; GRANT ALL ON public.agency_members TO service_role;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.is_agency_member(_agency uuid, _user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.agencies a WHERE a.id=_agency AND a.admin_id=_user)
      OR EXISTS (SELECT 1 FROM public.agency_members m WHERE m.agency_id=_agency AND m.user_id=_user AND m.status='active');
$$;
CREATE OR REPLACE FUNCTION private.is_agency_admin_over(_agent uuid, _viewer uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT _agent IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.agency_members m JOIN public.agencies a ON a.id=m.agency_id
    WHERE m.user_id=_agent AND m.status='active'
      AND (a.admin_id=_viewer OR EXISTS (SELECT 1 FROM public.agency_members m2 WHERE m2.agency_id=a.id AND m2.user_id=_viewer AND m2.role='admin' AND m2.status='active')));
$$;

CREATE POLICY "agency visible to members" ON public.agencies FOR SELECT TO authenticated
  USING (admin_id = auth.uid() OR private.is_agency_member(id, auth.uid()) OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.agency_members m WHERE m.agency_id=id AND m.user_id=auth.uid() AND m.status='invited'));
CREATE POLICY "create own agency" ON public.agencies FOR INSERT TO authenticated WITH CHECK (admin_id = auth.uid());
CREATE POLICY "admin edits agency" ON public.agencies FOR UPDATE TO authenticated USING (admin_id = auth.uid()) WITH CHECK (admin_id = auth.uid());
CREATE POLICY "members visible within agency" ON public.agency_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_agency_member(agency_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.invite_agency_member(_agency uuid, _email text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid; a public.agencies%ROWTYPE;
BEGIN
  SELECT * INTO a FROM public.agencies WHERE id=_agency;
  IF NOT FOUND OR a.admin_id <> auth.uid() THEN RAISE EXCEPTION 'Only the agency admin can invite members.'; END IF;
  SELECT id INTO v_user FROM auth.users WHERE lower(email)=lower(trim(_email)) LIMIT 1;
  IF v_user IS NULL THEN RAISE EXCEPTION 'No SPACES account uses this email yet. Ask them to register first.'; END IF;
  IF v_user = a.admin_id THEN RAISE EXCEPTION 'You are already the agency admin.'; END IF;
  INSERT INTO public.agency_members(agency_id, user_id, invited_email, invited_by, status)
    VALUES (_agency, v_user, lower(trim(_email)), auth.uid(), 'invited')
    ON CONFLICT (agency_id, user_id) DO UPDATE SET status='invited', invited_by=auth.uid();
  INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (v_user, 'agency_invite', 'Agency invitation', a.name || ' invited you to join their team.', '/agency', jsonb_build_object('agency_id', _agency));
  RETURN 'invited';
END $$;
CREATE OR REPLACE FUNCTION public.respond_agency_invite(_member_id uuid, _accept boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.agency_members SET status = CASE WHEN _accept THEN 'active' ELSE 'declined' END, accepted_at = CASE WHEN _accept THEN now() END
   WHERE id=_member_id AND user_id=auth.uid() AND status='invited';
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found.'; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.remove_agency_member(_member_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.agency_members m SET status='removed' FROM public.agencies a
   WHERE m.id=_member_id AND a.id=m.agency_id AND (a.admin_id=auth.uid() OR m.user_id=auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'Not allowed.'; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.agency_overview(_agency uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.agencies%ROWTYPE; ids uuid[];
BEGIN
  SELECT * INTO a FROM public.agencies WHERE id=_agency;
  IF NOT FOUND OR NOT (a.admin_id=auth.uid() OR EXISTS (SELECT 1 FROM agency_members WHERE agency_id=_agency AND user_id=auth.uid() AND role='admin' AND status='active')) THEN
    RAISE EXCEPTION 'Only agency admins can view the team overview.'; END IF;
  SELECT array_agg(user_id) INTO ids FROM agency_members WHERE agency_id=_agency AND status='active';
  ids := COALESCE(ids,'{}') || a.admin_id;
  RETURN jsonb_build_object(
    'properties', (SELECT count(*) FROM properties WHERE owner_id = ANY(ids) OR id IN (SELECT property_id FROM property_agents WHERE agent_id = ANY(ids))),
    'leads', (SELECT count(*) FROM leads l WHERE l.property_id IN (SELECT property_id FROM property_agents WHERE agent_id = ANY(ids)) OR l.property_id IN (SELECT id FROM properties WHERE owner_id = ANY(ids))),
    'deals', (SELECT count(*) FROM deals WHERE agent_id = ANY(ids) AND deleted_at IS NULL),
    'commission_protected', (SELECT COALESCE(sum(amount),0) FROM deal_commissions WHERE agent_id = ANY(ids) AND status='protected'),
    'commission_payable', (SELECT COALESCE(sum(amount),0) FROM deal_commissions WHERE agent_id = ANY(ids) AND status IN ('pending_completion','payable')),
    'commission_paid', (SELECT COALESCE(sum(amount),0) FROM deal_commissions WHERE agent_id = ANY(ids) AND status='paid'),
    'agents', (SELECT jsonb_agg(jsonb_build_object('id',p.id,'name',p.full_name,
        'deals',(SELECT count(*) FROM deals d WHERE d.agent_id=p.id AND d.deleted_at IS NULL),
        'protected',(SELECT COALESCE(sum(amount),0) FROM deal_commissions c WHERE c.agent_id=p.id AND c.status='protected')))
      FROM profiles p WHERE p.id = ANY(ids)));
END $$;
REVOKE ALL ON FUNCTION public.invite_agency_member(uuid,text) FROM anon, public;
REVOKE ALL ON FUNCTION public.respond_agency_invite(uuid,boolean) FROM anon, public;
REVOKE ALL ON FUNCTION public.remove_agency_member(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.agency_overview(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.invite_agency_member(uuid,text), public.respond_agency_invite(uuid,boolean), public.remove_agency_member(uuid), public.agency_overview(uuid) TO authenticated;

-- Agency admins may view deals / offers / commissions of their team's agents
CREATE POLICY "agency admins view team deals" ON public.deals FOR SELECT TO authenticated USING (private.is_agency_admin_over(agent_id, auth.uid()));
CREATE POLICY "agency admins view team offers" ON public.offers FOR SELECT TO authenticated USING (private.is_agency_admin_over(agent_id, auth.uid()));
CREATE POLICY "agency admins view team commissions" ON public.deal_commissions FOR SELECT TO authenticated USING (private.is_agency_admin_over(agent_id, auth.uid()));

-- Buyer/owner-facing availability is safe to read publicly (already a column on properties)

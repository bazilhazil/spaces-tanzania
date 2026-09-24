
ALTER TYPE public.deal_stage ADD VALUE IF NOT EXISTS 'verification';
ALTER TYPE public.deal_stage ADD VALUE IF NOT EXISTS 'payment';

-- Deal economics columns (additive)
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS current_offer_id uuid,
  ADD COLUMN IF NOT EXISTS asking_price numeric,
  ADD COLUMN IF NOT EXISTS agreed_price numeric,
  ADD COLUMN IF NOT EXISTS transaction_type text,
  ADD COLUMN IF NOT EXISTS agency_id uuid,
  ADD COLUMN IF NOT EXISTS commission_rule_id uuid REFERENCES public.pricing_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS spaces_fee_rule_id uuid REFERENCES public.pricing_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS estimated_spaces_fee numeric,
  ADD COLUMN IF NOT EXISTS spaces_fee_tax numeric,
  ADD COLUMN IF NOT EXISTS agent_commission numeric,
  ADD COLUMN IF NOT EXISTS commission_rate numeric,
  ADD COLUMN IF NOT EXISTS other_charges numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agreement_at timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS seller_confirmed_at timestamptz;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'available';
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_availability_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_availability_check
  CHECK (availability IN ('available','offer_received','negotiation','reserved','under_transaction','sold','rented'));

-- OFFERS
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL DEFAULT ('OFR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  owner_id uuid,
  agent_id uuid,
  agency_id uuid,
  parent_offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  made_by uuid NOT NULL,
  made_by_side text NOT NULL CHECK (made_by_side IN ('buyer','seller')),
  amount numeric NOT NULL CHECK (amount > 0),
  deposit_amount numeric CHECK (deposit_amount IS NULL OR deposit_amount >= 0),
  currency text NOT NULL DEFAULT 'TZS',
  completion_date date,
  financing_method text CHECK (financing_method IS NULL OR financing_method IN ('cash','mortgage','other')),
  conditions text,
  message text,
  buyer_name text, buyer_phone text, buyer_email text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','viewed','countered','accepted','declined','withdrawn','expired')),
  expires_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz, responded_at timestamptz, accepted_at timestamptz,
  declined_at timestamptz, withdrawn_at timestamptz, expired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS offers_deal_idx ON public.offers(deal_id, created_at);
CREATE INDEX IF NOT EXISTS offers_property_idx ON public.offers(property_id, status);
CREATE INDEX IF NOT EXISTS offers_buyer_idx ON public.offers(buyer_id);
CREATE INDEX IF NOT EXISTS offers_owner_idx ON public.offers(owner_id);
CREATE INDEX IF NOT EXISTS offers_agent_idx ON public.offers(agent_id);
CREATE INDEX IF NOT EXISTS offers_expires_idx ON public.offers(expires_at) WHERE status IN ('submitted','viewed');
GRANT SELECT ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers visible to parties" ON public.offers FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR owner_id = auth.uid() OR agent_id = auth.uid()
         OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_current_offer_fk;
ALTER TABLE public.deals ADD CONSTRAINT deals_current_offer_fk FOREIGN KEY (current_offer_id) REFERENCES public.offers(id) ON DELETE SET NULL;

-- CHECKLIST
CREATE TABLE IF NOT EXISTS public.deal_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  phase text NOT NULL DEFAULT 'verification' CHECK (phase IN ('verification','payment','completion')),
  required boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  completed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, key)
);
GRANT SELECT ON public.deal_checklist_items TO authenticated;
GRANT ALL ON public.deal_checklist_items TO service_role;
ALTER TABLE public.deal_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklist visible to deal parties" ON public.deal_checklist_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.buyer_id = auth.uid() OR d.owner_id = auth.uid() OR d.agent_id = auth.uid()
    OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))));

-- COMMISSIONS
CREATE TABLE IF NOT EXISTS public.deal_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL UNIQUE REFERENCES public.deals(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  rule_id uuid REFERENCES public.pricing_rules(id) ON DELETE SET NULL,
  rate numeric,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TZS',
  status text NOT NULL DEFAULT 'estimated' CHECK (status IN ('estimated','protected','pending_completion','payable','paid','cancelled')),
  completion_condition text NOT NULL DEFAULT 'Paid when the transaction is completed and confirmed.',
  protected_at timestamptz, payable_at timestamptz, paid_at timestamptz, cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deal_commissions_agent_idx ON public.deal_commissions(agent_id, status);
GRANT SELECT ON public.deal_commissions TO authenticated;
GRANT ALL ON public.deal_commissions TO service_role;
ALTER TABLE public.deal_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commission visible to deal parties" ON public.deal_commissions FOR SELECT TO authenticated
  USING (agent_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
    OR EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.owner_id = auth.uid()));

-- DEAL PAYMENT ITEMS
CREATE TABLE IF NOT EXISTS public.deal_payment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('deposit','balance','agent_commission','spaces_fee','other')),
  label text NOT NULL,
  payer text NOT NULL DEFAULT 'buyer',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TZS',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','refunded','cancelled')),
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, kind)
);
GRANT SELECT ON public.deal_payment_items TO authenticated;
GRANT ALL ON public.deal_payment_items TO service_role;
ALTER TABLE public.deal_payment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deal payments visible to parties" ON public.deal_payment_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.buyer_id = auth.uid() OR d.owner_id = auth.uid() OR d.agent_id = auth.uid()
    OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))));
CREATE POLICY "admins update deal payments" ON public.deal_payment_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
GRANT UPDATE ON public.deal_payment_items TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_guard_deal_payment_item() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    IF NEW.payment_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.id = NEW.payment_id AND p.status IN ('paid','succeeded')) THEN
      RAISE EXCEPTION 'A payment can only be marked paid after a confirmed payment record exists.';
    END IF;
    NEW.paid_at := COALESCE(NEW.paid_at, now());
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_deal_payment_item ON public.deal_payment_items;
CREATE TRIGGER guard_deal_payment_item BEFORE UPDATE ON public.deal_payment_items FOR EACH ROW EXECUTE FUNCTION public.tg_guard_deal_payment_item();

-- IMMUTABLE AUDIT LOG
CREATE TABLE IF NOT EXISTS public.deal_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  actor_id uuid,
  action text NOT NULL,
  label text NOT NULL,
  amount numeric,
  note text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deal_audit_deal_idx ON public.deal_audit_log(deal_id, created_at);
GRANT SELECT ON public.deal_audit_log TO authenticated;
GRANT ALL ON public.deal_audit_log TO service_role;
ALTER TABLE public.deal_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit visible to deal parties" ON public.deal_audit_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.buyer_id = auth.uid() OR d.owner_id = auth.uid() OR d.agent_id = auth.uid()
    OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))));
CREATE OR REPLACE FUNCTION public.tg_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Audit history cannot be changed.'; END $$;
DROP TRIGGER IF EXISTS deal_audit_immutable ON public.deal_audit_log;
CREATE TRIGGER deal_audit_immutable BEFORE UPDATE OR DELETE ON public.deal_audit_log FOR EACH ROW EXECUTE FUNCTION public.tg_audit_immutable();

CREATE OR REPLACE FUNCTION private.deal_audit(_deal uuid, _offer uuid, _action text, _label text, _amount numeric, _note text, _old jsonb, _new jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  INSERT INTO public.deal_audit_log(deal_id, offer_id, actor_id, action, label, amount, note, old_value, new_value)
  VALUES (_deal, _offer, auth.uid(), _action, _label, _amount, _note, _old, _new);
$$;

-- Stage change audit (all transitions, automatic or not)
CREATE OR REPLACE FUNCTION public.tg_deal_audit_trail() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    PERFORM private.deal_audit(NEW.id, NEW.current_offer_id, 'stage_changed', 'Stage changed', NULL, NEW.cancel_reason,
      jsonb_build_object('stage', OLD.stage), jsonb_build_object('stage', NEW.stage));
    IF NEW.stage = 'cancelled' THEN
      UPDATE public.deal_commissions SET status='cancelled', cancelled_at=now(), updated_at=now() WHERE deal_id=NEW.id AND status <> 'paid';
      UPDATE public.deal_payment_items SET status='cancelled', updated_at=now() WHERE deal_id=NEW.id AND status IN ('pending','processing');
      IF NEW.property_id IS NOT NULL THEN
        UPDATE public.properties SET availability='available'
          WHERE id=NEW.property_id AND availability IN ('reserved','under_transaction','negotiation','offer_received')
          AND NOT EXISTS (SELECT 1 FROM public.deals d2 WHERE d2.property_id=NEW.property_id AND d2.id<>NEW.id AND d2.agreed_price IS NOT NULL AND d2.stage NOT IN ('cancelled','completed'));
      END IF;
    END IF;
  END IF;
  IF NEW.agent_id IS DISTINCT FROM OLD.agent_id THEN
    IF OLD.agent_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.deal_commissions c WHERE c.deal_id=NEW.id AND c.status IN ('protected','pending_completion','payable'))
       AND auth.uid() IS NOT NULL AND NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
      RAISE EXCEPTION 'The Dalali on this deal has a protected commission. Only SPACES admin can change the agent.';
    END IF;
    PERFORM private.deal_audit(NEW.id, NULL, 'agent_changed', 'Dalali changed', NULL, NULL,
      jsonb_build_object('agent_id', OLD.agent_id), jsonb_build_object('agent_id', NEW.agent_id));
  END IF;
  IF NEW.agent_commission IS DISTINCT FROM OLD.agent_commission AND OLD.agent_commission IS NOT NULL THEN
    PERFORM private.deal_audit(NEW.id, NULL, 'commission_changed', 'Commission changed', NEW.agent_commission, NULL,
      jsonb_build_object('amount', OLD.agent_commission), jsonb_build_object('amount', NEW.agent_commission));
  END IF;
  IF NEW.estimated_spaces_fee IS DISTINCT FROM OLD.estimated_spaces_fee THEN
    PERFORM private.deal_audit(NEW.id, NULL, 'fee_calculated', 'SPACES service fee calculated', NEW.estimated_spaces_fee, NULL,
      jsonb_build_object('fee', OLD.estimated_spaces_fee), jsonb_build_object('fee', NEW.estimated_spaces_fee, 'rule_id', NEW.spaces_fee_rule_id));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS deal_audit_trail ON public.deals;
CREATE TRIGGER deal_audit_trail BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.tg_deal_audit_trail();

CREATE OR REPLACE FUNCTION public.tg_deal_doc_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM private.deal_audit(NEW.deal_id, NULL, 'document_uploaded', 'Document uploaded', NULL, NEW.name, NULL, jsonb_build_object('kind', NEW.kind));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS deal_doc_audit ON public.deal_documents;
CREATE TRIGGER deal_doc_audit AFTER INSERT ON public.deal_documents FOR EACH ROW EXECUTE FUNCTION public.tg_deal_doc_audit();

CREATE OR REPLACE FUNCTION public.tg_deal_payment_item_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM private.deal_audit(NEW.deal_id, NULL, 'payment_created', NEW.label || ' created', NEW.amount, NULL, NULL, jsonb_build_object('status', NEW.status));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM private.deal_audit(NEW.deal_id, NULL, CASE WHEN NEW.status='paid' THEN 'payment_confirmed' ELSE 'payment_status' END,
      NEW.label || ': ' || NEW.status, NEW.amount, NULL, jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status));
    IF NEW.status='paid' THEN PERFORM public.advance_deal(NEW.deal_id); END IF;
  END IF;
  RETURN NEW;
END $$;

-- SETTINGS DEFAULTS (admin-configurable)
INSERT INTO public.admin_settings(key, value) VALUES
 ('deal_checklist', '[
   {"key":"buyer_identity","label":"Buyer identity","phase":"verification","required":true},
   {"key":"seller_identity","label":"Seller identity","phase":"verification","required":true},
   {"key":"property_documents","label":"Property documents","phase":"verification","required":true},
   {"key":"required_verification","label":"Required verification","phase":"verification","required":true},
   {"key":"agreement_document","label":"Agreement / document","phase":"verification","required":true},
   {"key":"deposit","label":"Deposit","phase":"payment","required":true},
   {"key":"balance","label":"Balance","phase":"payment","required":true},
   {"key":"agent_commission","label":"Agent commission","phase":"payment","required":true},
   {"key":"spaces_fee","label":"SPACES service fee","phase":"payment","required":true},
   {"key":"completion_confirmation","label":"Completion confirmation","phase":"completion","required":true}
 ]'::jsonb),
 ('offer_rules', '{"on_first_offer":"offer_received","on_counter":"negotiation","on_accept":"reserved","on_payment":"under_transaction","on_complete_sale":"sold","on_complete_rent":"rented","block_offers_when_reserved":true,"default_commission_rate":3}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- FEE CALC (single source of truth)
CREATE OR REPLACE FUNCTION public.calc_deal_fees(_deal_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.deals%ROWTYPE; r public.pricing_rules%ROWTYPE; c public.pricing_rules%ROWTYPE;
  v_price numeric; v_fee numeric := 0; v_tax numeric := 0; v_comm numeric := 0; v_rate numeric; v_rules jsonb;
BEGIN
  SELECT * INTO d FROM public.deals WHERE id=_deal_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  v_price := COALESCE(d.agreed_price, d.value, d.asking_price, 0);
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
      v_rate := c.percentage;
      v_comm := COALESCE(v_price*COALESCE(c.percentage,0)/100,0) + COALESCE(c.fixed_amount,0);
      IF c.min_amount IS NOT NULL THEN v_comm := GREATEST(v_comm, c.min_amount); END IF;
      IF c.max_amount IS NOT NULL THEN v_comm := LEAST(v_comm, c.max_amount); END IF;
    ELSE
      SELECT COALESCE((value->>'default_commission_rate')::numeric, 0) INTO v_rate FROM public.admin_settings WHERE key='offer_rules';
      v_comm := v_price * COALESCE(v_rate,0)/100;
    END IF;
  END IF;
  UPDATE public.deals SET estimated_spaces_fee=round(v_fee,2), spaces_fee_tax=round(v_tax,2), spaces_fee_rule_id=r.id,
    agent_commission=CASE WHEN d.agent_id IS NULL THEN NULL ELSE round(v_comm,2) END, commission_rate=v_rate, commission_rule_id=c.id
   WHERE id=_deal_id;
  RETURN jsonb_build_object('price',v_price,'spaces_fee',round(v_fee,2),'tax',round(v_tax,2),'rule_id',r.id,'rule_name',r.name,
    'percentage',r.percentage,'commission',round(v_comm,2),'commission_rate',v_rate,'other',d.other_charges,
    'total_charges', round(v_fee+v_tax+v_comm+COALESCE(d.other_charges,0),2));
END $$;

CREATE OR REPLACE FUNCTION private.offer_rule(_k text) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT value->>_k FROM public.admin_settings WHERE key='offer_rules';
$$;

CREATE OR REPLACE FUNCTION private.notify(_user uuid, _kind text, _title text, _body text, _deal uuid, _dedupe text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF _user IS NULL OR _user = auth.uid() THEN RETURN; END IF;
  INSERT INTO public.notifications(user_id, kind, title, body, link, data, dedupe_key)
  VALUES (_user, _kind, _title, _body, '/deals?deal=' || _deal, jsonb_build_object('deal_id', _deal), _dedupe)
  ON CONFLICT DO NOTHING;
END $$;

-- ADVANCE DEAL based on facts (checklist/payments)
CREATE OR REPLACE FUNCTION public.advance_deal(_deal_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.deals%ROWTYPE; v_ver_open int; v_pay_open int; v_any_done int; v_new text;
BEGIN
  SELECT * INTO d FROM public.deals WHERE id=_deal_id;
  IF NOT FOUND OR d.stage::text IN ('completed','cancelled') OR d.agreed_price IS NULL THEN RETURN d.stage::text; END IF;
  -- sync payment checklist items from confirmed payments
  UPDATE public.deal_checklist_items ci SET completed_at=now()
   WHERE ci.deal_id=_deal_id AND ci.phase='payment' AND ci.completed_at IS NULL
     AND EXISTS (SELECT 1 FROM public.deal_payment_items p WHERE p.deal_id=_deal_id AND p.kind=ci.key AND p.status='paid');
  UPDATE public.deal_checklist_items ci SET completed_at=now()
   WHERE ci.deal_id=_deal_id AND ci.phase='payment' AND ci.completed_at IS NULL
     AND EXISTS (SELECT 1 FROM public.deal_payment_items p WHERE p.deal_id=_deal_id AND p.kind=ci.key AND p.amount=0);
  SELECT count(*) FILTER (WHERE phase='verification' AND required AND completed_at IS NULL),
         count(*) FILTER (WHERE phase='payment' AND required AND completed_at IS NULL),
         count(*) FILTER (WHERE completed_at IS NOT NULL)
    INTO v_ver_open, v_pay_open, v_any_done FROM public.deal_checklist_items WHERE deal_id=_deal_id;
  v_new := d.stage::text;
  IF v_ver_open = 0 AND v_pay_open = 0 AND d.buyer_confirmed_at IS NOT NULL AND d.seller_confirmed_at IS NOT NULL THEN
    v_new := 'completed';
  ELSIF v_ver_open = 0 THEN v_new := 'payment';
  ELSIF v_any_done > 0 THEN v_new := 'verification';
  END IF;
  IF v_new <> d.stage::text THEN
    UPDATE public.deals SET stage=v_new::public.deal_stage,
      completed_at = CASE WHEN v_new='completed' THEN now() ELSE completed_at END WHERE id=_deal_id;
    IF v_new='payment' AND d.property_id IS NOT NULL THEN
      UPDATE public.properties SET availability=COALESCE(private.offer_rule('on_payment'),'under_transaction') WHERE id=d.property_id;
      PERFORM private.notify(d.buyer_id,'payment_required','Payment required','Verification is complete. Payments for your deal are now due.',_deal_id,'payreq:'||_deal_id);
      PERFORM private.notify(d.owner_id,'deal_stage','Verification complete','The deal has moved to payment.',_deal_id,'payreq-o:'||_deal_id);
    ELSIF v_new='verification' THEN
      PERFORM private.notify(d.buyer_id,'verification_required','Verification in progress','Documents are being checked for your deal.',_deal_id,'ver:'||_deal_id);
      PERFORM private.notify(d.owner_id,'verification_required','Verification required','Please complete the verification checklist.',_deal_id,'ver-o:'||_deal_id);
    ELSIF v_new='completed' THEN
      IF d.property_id IS NOT NULL THEN
        UPDATE public.properties SET availability = CASE WHEN d.transaction_type='rent' THEN COALESCE(private.offer_rule('on_complete_rent'),'rented') ELSE COALESCE(private.offer_rule('on_complete_sale'),'sold') END WHERE id=d.property_id;
      END IF;
      UPDATE public.deal_commissions SET status='payable', payable_at=now(), updated_at=now() WHERE deal_id=_deal_id AND status IN ('protected','pending_completion');
      PERFORM private.notify(d.buyer_id,'deal_completed','Transaction completed','Your deal is complete.',_deal_id,'done:'||_deal_id);
      PERFORM private.notify(d.owner_id,'deal_completed','Transaction completed','Your deal is complete.',_deal_id,'done-o:'||_deal_id);
      PERFORM private.notify(d.agent_id,'commission_payable','Commission payable','Your commission is now payable.',_deal_id,'cpay:'||_deal_id);
    END IF;
  END IF;
  RETURN v_new;
END $$;

DROP TRIGGER IF EXISTS deal_payment_item_audit ON public.deal_payment_items;
CREATE TRIGGER deal_payment_item_audit AFTER INSERT OR UPDATE ON public.deal_payment_items FOR EACH ROW EXECUTE FUNCTION public.tg_deal_payment_item_audit();

-- EXPIRE OFFERS
CREATE OR REPLACE FUNCTION public.expire_offers() RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o record; n int := 0;
BEGIN
  FOR o IN UPDATE public.offers SET status='expired', expired_at=now(), updated_at=now()
    WHERE status IN ('submitted','viewed') AND expires_at IS NOT NULL AND expires_at < now() RETURNING * LOOP
    n := n + 1;
    INSERT INTO public.deal_audit_log(deal_id, offer_id, actor_id, action, label, amount) VALUES (o.deal_id, o.id, NULL, 'offer_expired', 'Offer expired', o.amount);
    INSERT INTO public.notifications(user_id, kind, title, body, link, data, dedupe_key) VALUES
      (o.buyer_id,'offer_expired','Offer expired','An offer on your deal expired.','/deals?deal='||o.deal_id, jsonb_build_object('deal_id',o.deal_id),'exp-b:'||o.id),
      (COALESCE(o.owner_id,o.buyer_id),'offer_expired','Offer expired','An offer on your deal expired.','/deals?deal='||o.deal_id, jsonb_build_object('deal_id',o.deal_id),'exp-o:'||o.id)
    ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN n;
END $$;

-- SUBMIT OFFER (buyer)
CREATE OR REPLACE FUNCTION public.submit_offer(_property_id uuid, _amount numeric, _deposit numeric, _completion date, _financing text,
  _conditions text, _expires_at timestamptz, _name text, _phone text, _email text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.properties%ROWTYPE; v_uid uuid := auth.uid(); v_agent uuid; v_deal uuid; v_offer uuid; v_deal_row public.deals%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Please sign in to make an offer.'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Enter a valid offer amount.'; END IF;
  SELECT * INTO p FROM public.properties WHERE id=_property_id;
  IF NOT FOUND OR p.status <> 'live' THEN RAISE EXCEPTION 'This property is not accepting offers.'; END IF;
  IF p.availability IN ('sold','rented','under_transaction') OR (p.availability='reserved' AND COALESCE(private.offer_rule('block_offers_when_reserved'),'true')='true') THEN
    RAISE EXCEPTION 'This property is reserved and is not accepting new offers.';
  END IF;
  IF p.owner_id = v_uid OR private.is_property_agent(_property_id, v_uid) THEN RAISE EXCEPTION 'You cannot make an offer on your own listing.'; END IF;
  IF EXISTS (SELECT 1 FROM public.offers WHERE property_id=_property_id AND buyer_id=v_uid AND status IN ('submitted','viewed')) THEN
    RAISE EXCEPTION 'You already have an open offer on this property.';
  END IF;
  SELECT agent_id INTO v_agent FROM public.property_agents WHERE property_id=_property_id ORDER BY created_at LIMIT 1;
  SELECT id INTO v_deal FROM public.deals WHERE property_id=_property_id AND buyer_id=v_uid AND deleted_at IS NULL
     AND stage NOT IN ('completed','cancelled') ORDER BY created_at DESC LIMIT 1;
  IF v_deal IS NULL THEN
    INSERT INTO public.deals(property_id, buyer_id, buyer_name, buyer_phone, buyer_email, owner_id, agent_id, stage, value, asking_price, transaction_type, currency)
    VALUES (_property_id, v_uid, _name, _phone, _email, p.owner_id, v_agent, 'offer_made', _amount, p.price, p.listing_type::text, COALESCE(p.currency,'TZS'))
    RETURNING id INTO v_deal;
  END IF;
  INSERT INTO public.offers(deal_id, property_id, buyer_id, owner_id, agent_id, made_by, made_by_side, amount, deposit_amount, currency,
     completion_date, financing_method, conditions, buyer_name, buyer_phone, buyer_email, expires_at)
  VALUES (v_deal, _property_id, v_uid, p.owner_id, (SELECT agent_id FROM public.deals WHERE id=v_deal), v_uid, 'buyer', _amount, _deposit, COALESCE(p.currency,'TZS'),
     _completion, _financing, NULLIF(trim(_conditions),''), _name, _phone, _email, _expires_at)
  RETURNING id INTO v_offer;
  UPDATE public.deals SET current_offer_id=v_offer, value=_amount, asking_price=COALESCE(asking_price,p.price),
    transaction_type=COALESCE(transaction_type,p.listing_type::text), last_activity_at=now(),
    stage = CASE WHEN stage IN ('new_inquiry','contacted','viewing_scheduled','viewing_completed') THEN 'offer_made'::public.deal_stage ELSE stage END
   WHERE id=v_deal RETURNING * INTO v_deal_row;
  PERFORM private.deal_audit(v_deal, v_offer, 'offer_created', 'Offer submitted by buyer', _amount, _conditions, NULL,
    jsonb_build_object('amount',_amount,'deposit',_deposit,'completion_date',_completion,'financing',_financing));
  IF p.availability = 'available' THEN UPDATE public.properties SET availability=COALESCE(private.offer_rule('on_first_offer'),'offer_received') WHERE id=_property_id; END IF;
  PERFORM private.notify(p.owner_id,'offer_received','New offer received', p.title || ' — TZS ' || to_char(_amount,'FM999,999,999,999'), v_deal, 'offer:'||v_offer);
  PERFORM private.notify(v_deal_row.agent_id,'offer_received','New offer received', p.title || ' — TZS ' || to_char(_amount,'FM999,999,999,999'), v_deal, 'offer-a:'||v_offer);
  INSERT INTO public.notifications(user_id, kind, title, body, link, data, dedupe_key)
    VALUES (v_uid,'offer_submitted','Offer submitted','Your offer on '||p.title||' was sent to the seller.','/deals?deal='||v_deal, jsonb_build_object('deal_id',v_deal),'offer-b:'||v_offer)
    ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('offer_id', v_offer, 'deal_id', v_deal);
END $$;

-- RESPOND (accept / decline / counter / withdraw / viewed)
CREATE OR REPLACE FUNCTION public.respond_offer(_offer_id uuid, _action text, _amount numeric DEFAULT NULL, _deposit numeric DEFAULT NULL,
  _completion date DEFAULT NULL, _conditions text DEFAULT NULL, _message text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.offers%ROWTYPE; d public.deals%ROWTYPE; v_uid uuid := auth.uid(); v_is_buyer boolean; v_is_seller boolean;
  v_new uuid; v_side text; v_fees jsonb; v_tpl jsonb; v_i int := 0; it jsonb; v_title text;
BEGIN
  PERFORM public.expire_offers();
  SELECT * INTO o FROM public.offers WHERE id=_offer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found.'; END IF;
  SELECT * INTO d FROM public.deals WHERE id=o.deal_id;
  SELECT title INTO v_title FROM public.properties WHERE id=o.property_id;
  v_is_buyer := v_uid = o.buyer_id;
  v_is_seller := v_uid = o.owner_id OR v_uid = d.agent_id;
  IF NOT (v_is_buyer OR v_is_seller) THEN RAISE EXCEPTION 'You are not part of this offer.'; END IF;

  IF _action = 'viewed' THEN
    IF o.status='submitted' AND ((o.made_by_side='buyer' AND v_is_seller) OR (o.made_by_side='seller' AND v_is_buyer)) THEN
      UPDATE public.offers SET status='viewed', viewed_at=now(), updated_at=now() WHERE id=o.id;
      PERFORM private.deal_audit(o.deal_id, o.id, 'offer_viewed', 'Offer viewed', o.amount, NULL, NULL, NULL);
      PERFORM private.notify(o.made_by,'offer_viewed','Offer viewed','Your offer on '||v_title||' was viewed.',o.deal_id,'viewed:'||o.id);
    END IF;
    RETURN jsonb_build_object('ok',true);
  END IF;

  IF _action = 'withdraw' THEN
    IF o.made_by <> v_uid OR o.status NOT IN ('submitted','viewed') THEN RAISE EXCEPTION 'This offer can no longer be withdrawn.'; END IF;
    UPDATE public.offers SET status='withdrawn', withdrawn_at=now(), responded_at=now(), updated_at=now() WHERE id=o.id;
    PERFORM private.deal_audit(o.deal_id, o.id, 'offer_withdrawn', 'Offer withdrawn', o.amount, NULL, jsonb_build_object('status',o.status), jsonb_build_object('status','withdrawn'));
    RETURN jsonb_build_object('ok',true);
  END IF;

  IF o.status NOT IN ('submitted','viewed') THEN RAISE EXCEPTION 'This offer is no longer open.'; END IF;
  -- only the other side may respond
  IF (o.made_by_side='buyer' AND NOT v_is_seller) OR (o.made_by_side='seller' AND NOT v_is_buyer) THEN
    RAISE EXCEPTION 'Only the other side can respond to this offer.';
  END IF;
  v_side := CASE WHEN v_is_buyer THEN 'buyer' ELSE 'seller' END;

  IF _action = 'decline' THEN
    UPDATE public.offers SET status='declined', declined_at=now(), responded_at=now(), updated_at=now() WHERE id=o.id;
    PERFORM private.deal_audit(o.deal_id, o.id, 'offer_declined', 'Offer declined by '||v_side, o.amount, _message, jsonb_build_object('status',o.status), jsonb_build_object('status','declined'));
    PERFORM private.notify(o.made_by,'offer_declined','Offer declined','Your offer on '||v_title||' was declined.',o.deal_id,'decl:'||o.id);
    RETURN jsonb_build_object('ok',true);
  END IF;

  IF _action = 'counter' THEN
    IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Enter a valid counter amount.'; END IF;
    UPDATE public.offers SET status='countered', responded_at=now(), updated_at=now() WHERE id=o.id;
    INSERT INTO public.offers(deal_id, property_id, buyer_id, owner_id, agent_id, parent_offer_id, made_by, made_by_side, amount, deposit_amount, currency,
       completion_date, financing_method, conditions, message, expires_at)
    VALUES (o.deal_id, o.property_id, o.buyer_id, o.owner_id, d.agent_id, o.id, v_uid, v_side, _amount, COALESCE(_deposit,o.deposit_amount), o.currency,
       COALESCE(_completion,o.completion_date), o.financing_method, COALESCE(NULLIF(trim(_conditions),''),o.conditions), _message, o.expires_at)
    RETURNING id INTO v_new;
    UPDATE public.deals SET current_offer_id=v_new, value=_amount, last_activity_at=now(),
      stage = CASE WHEN stage IN ('new_inquiry','contacted','viewing_scheduled','viewing_completed','offer_made') THEN 'negotiation'::public.deal_stage ELSE stage END
     WHERE id=o.deal_id;
    PERFORM private.deal_audit(o.deal_id, v_new, 'counter_offer', 'Counter-offer by '||v_side, _amount, _message, jsonb_build_object('amount',o.amount), jsonb_build_object('amount',_amount));
    UPDATE public.properties SET availability=COALESCE(private.offer_rule('on_counter'),'negotiation') WHERE id=o.property_id AND availability IN ('available','offer_received');
    PERFORM private.notify(o.made_by,'offer_countered','Counter-offer received', v_title||' — TZS '||to_char(_amount,'FM999,999,999,999'), o.deal_id, 'ctr:'||v_new);
    IF v_is_buyer THEN PERFORM private.notify(d.agent_id,'offer_countered','Counter-offer received', v_title||' — TZS '||to_char(_amount,'FM999,999,999,999'), o.deal_id, 'ctr-a:'||v_new); END IF;
    IF v_is_seller AND v_uid = o.owner_id THEN PERFORM private.notify(d.agent_id,'offer_countered','Owner sent a counter-offer', v_title, o.deal_id, 'ctr-a:'||v_new); END IF;
    RETURN jsonb_build_object('offer_id', v_new);
  END IF;

  IF _action = 'accept' THEN
    UPDATE public.offers SET status='accepted', accepted_at=now(), responded_at=now(), updated_at=now() WHERE id=o.id;
    UPDATE public.deals SET current_offer_id=o.id, agreed_price=o.amount, value=o.amount, agreement_at=now(), last_activity_at=now(),
      stage='offer_accepted' WHERE id=o.deal_id;
    PERFORM private.deal_audit(o.deal_id, o.id, 'offer_accepted', 'Offer accepted by '||v_side, o.amount, _message, jsonb_build_object('status',o.status), jsonb_build_object('status','accepted','agreed_price',o.amount));
    v_fees := public.calc_deal_fees(o.deal_id);
    SELECT * INTO d FROM public.deals WHERE id=o.deal_id;
    -- checklist from admin template
    SELECT value INTO v_tpl FROM public.admin_settings WHERE key='deal_checklist';
    FOR it IN SELECT * FROM jsonb_array_elements(COALESCE(v_tpl,'[]'::jsonb)) LOOP
      v_i := v_i + 1;
      IF (it->>'key') = 'agent_commission' AND d.agent_id IS NULL THEN CONTINUE; END IF;
      INSERT INTO public.deal_checklist_items(deal_id, key, label, phase, required, sort_order)
      VALUES (o.deal_id, it->>'key', it->>'label', COALESCE(it->>'phase','verification'), COALESCE((it->>'required')::boolean,true), v_i)
      ON CONFLICT (deal_id, key) DO NOTHING;
    END LOOP;
    INSERT INTO public.deal_payment_items(deal_id, kind, label, payer, amount, currency) VALUES
      (o.deal_id,'deposit','Deposit','buyer',COALESCE(o.deposit_amount,0),o.currency),
      (o.deal_id,'balance','Balance','buyer',GREATEST(o.amount-COALESCE(o.deposit_amount,0),0),o.currency),
      (o.deal_id,'spaces_fee','SPACES service fee','buyer',COALESCE(d.estimated_spaces_fee,0)+COALESCE(d.spaces_fee_tax,0),o.currency)
    ON CONFLICT (deal_id, kind) DO UPDATE SET amount=EXCLUDED.amount, status='pending';
    IF d.agent_id IS NOT NULL AND d.agent_id <> COALESCE(d.owner_id,'00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.deal_payment_items(deal_id, kind, label, payer, amount, currency)
        VALUES (o.deal_id,'agent_commission','Agent commission','seller',COALESCE(d.agent_commission,0),o.currency)
        ON CONFLICT (deal_id, kind) DO UPDATE SET amount=EXCLUDED.amount, status='pending';
      INSERT INTO public.deal_commissions(deal_id, agent_id, rule_id, rate, amount, currency, status, protected_at)
        VALUES (o.deal_id, d.agent_id, d.commission_rule_id, d.commission_rate, COALESCE(d.agent_commission,0), o.currency, 'protected', now())
        ON CONFLICT (deal_id) DO UPDATE SET amount=EXCLUDED.amount, rate=EXCLUDED.rate, status='protected', protected_at=now(), cancelled_at=NULL, updated_at=now();
      PERFORM private.deal_audit(o.deal_id, o.id, 'commission_protected', 'Dalali commission protected', d.agent_commission, NULL, NULL, jsonb_build_object('rate',d.commission_rate,'amount',d.agent_commission));
      PERFORM private.notify(d.agent_id,'commission_protected','Commission protected', v_title||' — TZS '||to_char(COALESCE(d.agent_commission,0),'FM999,999,999,999'), o.deal_id, 'cprot:'||o.deal_id);
    END IF;
    UPDATE public.properties SET availability=COALESCE(private.offer_rule('on_accept'),'reserved') WHERE id=o.property_id AND availability NOT IN ('sold','rented');
    PERFORM private.notify(o.made_by,'offer_accepted','Offer accepted', v_title||' — TZS '||to_char(o.amount,'FM999,999,999,999'), o.deal_id, 'acc:'||o.id);
    PERFORM private.notify(CASE WHEN v_is_buyer THEN o.owner_id ELSE o.buyer_id END,'offer_accepted','Agreement reached', v_title, o.deal_id, 'acc2:'||o.id);
    IF v_uid <> COALESCE(d.agent_id,v_uid) THEN PERFORM private.notify(d.agent_id,'offer_accepted','Offer accepted', v_title, o.deal_id, 'acc-a:'||o.id); END IF;
    RETURN jsonb_build_object('ok',true,'fees',v_fees);
  END IF;
  RAISE EXCEPTION 'Unknown action.';
END $$;

-- CHECKLIST TOGGLE (verification/completion items only; payments come from confirmed records)
CREATE OR REPLACE FUNCTION public.set_checklist_item(_item_id uuid, _done boolean) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ci public.deal_checklist_items%ROWTYPE; d public.deals%ROWTYPE; v_uid uuid := auth.uid();
BEGIN
  SELECT * INTO ci FROM public.deal_checklist_items WHERE id=_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found.'; END IF;
  SELECT * INTO d FROM public.deals WHERE id=ci.deal_id;
  IF NOT (v_uid = d.owner_id OR v_uid = d.agent_id OR public.has_role(v_uid,'admin') OR public.has_role(v_uid,'super_admin')) THEN
    RAISE EXCEPTION 'Only the seller, Dalali or SPACES admin can update the checklist.';
  END IF;
  IF ci.phase='payment' THEN RAISE EXCEPTION 'Payment items are ticked automatically once a payment is confirmed.'; END IF;
  IF ci.key='completion_confirmation' THEN RAISE EXCEPTION 'Completion is confirmed by both buyer and seller.'; END IF;
  IF d.stage::text IN ('completed','cancelled') THEN RAISE EXCEPTION 'This deal is closed.'; END IF;
  UPDATE public.deal_checklist_items SET completed_at = CASE WHEN _done THEN now() ELSE NULL END, completed_by = CASE WHEN _done THEN v_uid ELSE NULL END WHERE id=_item_id;
  PERFORM private.deal_audit(ci.deal_id, NULL, CASE WHEN _done THEN 'verification_completed' ELSE 'verification_reopened' END,
    ci.label || CASE WHEN _done THEN ' confirmed' ELSE ' reopened' END, NULL, NULL,
    jsonb_build_object('done', ci.completed_at IS NOT NULL), jsonb_build_object('done', _done));
  RETURN public.advance_deal(ci.deal_id);
END $$;

-- COMPLETION CONFIRMATION (both sides)
CREATE OR REPLACE FUNCTION public.confirm_deal_completion(_deal_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.deals%ROWTYPE; v_uid uuid := auth.uid();
BEGIN
  SELECT * INTO d FROM public.deals WHERE id=_deal_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deal not found.'; END IF;
  IF d.stage::text <> 'payment' THEN RAISE EXCEPTION 'Completion can be confirmed once verification is done.'; END IF;
  IF v_uid = d.buyer_id THEN UPDATE public.deals SET buyer_confirmed_at=now() WHERE id=_deal_id;
  ELSIF v_uid = d.owner_id OR v_uid = d.agent_id THEN UPDATE public.deals SET seller_confirmed_at=now() WHERE id=_deal_id;
  ELSE RAISE EXCEPTION 'You are not part of this deal.'; END IF;
  PERFORM private.deal_audit(_deal_id, NULL, 'completion_confirmed', 'Completion confirmed', NULL, NULL, NULL, NULL);
  SELECT * INTO d FROM public.deals WHERE id=_deal_id;
  IF d.buyer_confirmed_at IS NOT NULL AND d.seller_confirmed_at IS NOT NULL THEN
    UPDATE public.deal_checklist_items SET completed_at=now() WHERE deal_id=_deal_id AND key='completion_confirmation' AND completed_at IS NULL;
  END IF;
  RETURN public.advance_deal(_deal_id);
END $$;

-- ADMIN SUMMARY
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
    'pending_revenue', COALESCE(sum(estimated_spaces_fee) FILTER (WHERE stage::text='completed'),0),
    'agent_commissions', COALESCE(sum(agent_commission) FILTER (WHERE stage::text <> 'cancelled'),0)
  ) INTO r FROM public.deals
   WHERE deleted_at IS NULL AND (_from IS NULL OR created_at >= _from) AND (_to IS NULL OR created_at < _to);
  r := r || jsonb_build_object(
    'offers_today', (SELECT count(*) FROM public.offers WHERE created_at >= date_trunc('day', now())),
    'collected_revenue', (SELECT COALESCE(sum(amount),0) FROM public.deal_payment_items WHERE kind='spaces_fee' AND status='paid'));
  RETURN r;
END $$;

-- DALALI SUMMARY
CREATE OR REPLACE FUNCTION public.my_commission_summary() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
  SELECT jsonb_build_object(
    'protected', COALESCE(sum(amount) FILTER (WHERE status='protected'),0),
    'pending', COALESCE(sum(amount) FILTER (WHERE status IN ('pending_completion','payable')),0),
    'paid', COALESCE(sum(amount) FILTER (WHERE status='paid'),0),
    'count', count(*))
  FROM public.deal_commissions WHERE agent_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.submit_offer(uuid,numeric,numeric,date,text,text,timestamptz,text,text,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.submit_offer(uuid,numeric,numeric,date,text,text,timestamptz,text,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.respond_offer(uuid,text,numeric,numeric,date,text,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.respond_offer(uuid,text,numeric,numeric,date,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.set_checklist_item(uuid,boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.set_checklist_item(uuid,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.confirm_deal_completion(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.confirm_deal_completion(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_deal_summary(timestamptz,timestamptz) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_deal_summary(timestamptz,timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_commission_summary() TO authenticated;
REVOKE ALL ON FUNCTION public.expire_offers() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.expire_offers() TO authenticated;
REVOKE ALL ON FUNCTION public.calc_deal_fees(uuid) FROM anon, public, authenticated;
REVOKE ALL ON FUNCTION public.advance_deal(uuid) FROM anon, public, authenticated;

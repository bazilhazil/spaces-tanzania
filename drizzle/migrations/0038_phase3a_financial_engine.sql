ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_type text,
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS provider_transaction_id text,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS refund_status text,
  ADD COLUMN IF NOT EXISTS receipt_number text;

CREATE UNIQUE INDEX IF NOT EXISTS payments_receipt_number_uq ON public.payments(receipt_number) WHERE receipt_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_deal_id_idx ON public.payments(deal_id);

-- backfill from metadata written by earlier test payments
UPDATE public.payments SET
  deal_id = COALESCE(deal_id, NULLIF(metadata->>'deal_id','')::uuid),
  payment_type = COALESCE(payment_type, metadata->>'item', purpose),
  is_test = (provider = 'test_mode' OR COALESCE((metadata->>'test')::boolean,false))
WHERE deal_id IS NULL OR payment_type IS NULL;

CREATE SEQUENCE IF NOT EXISTS public.payment_receipt_seq;

CREATE OR REPLACE FUNCTION public.tg_payment_receipt()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IN ('paid','succeeded') AND NEW.receipt_number IS NULL THEN
    NEW.receipt_number := CASE WHEN NEW.is_test THEN 'TEST-RCP-' ELSE 'RCP-' END
      || to_char(now(),'YYYY') || '-' || lpad(nextval('public.payment_receipt_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS payments_receipt ON public.payments;
CREATE TRIGGER payments_receipt BEFORE INSERT OR UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_payment_receipt();

-- financial audit on deal-linked payments
CREATE OR REPLACE FUNCTION public.tg_payment_fin_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private' AS $$
BEGIN
  IF NEW.deal_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    PERFORM private.deal_audit(NEW.deal_id, NULL, 'payment_created',
      'Payment created: '||COALESCE(NEW.payment_type,'payment')||CASE WHEN NEW.is_test THEN ' (TEST)' ELSE '' END,
      NEW.amount, NULL, NULL, jsonb_build_object('payment_id',NEW.id,'status',NEW.status,'test',NEW.is_test));
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      PERFORM private.deal_audit(NEW.deal_id, NULL, 'payment_status_changed', 'Payment status changed', NEW.amount, NULL,
        jsonb_build_object('status',OLD.status), jsonb_build_object('status',NEW.status,'payment_id',NEW.id));
    END IF;
    IF NEW.refund_status IS DISTINCT FROM OLD.refund_status THEN
      PERFORM private.deal_audit(NEW.deal_id, NULL, 'refund_'||COALESCE(NEW.refund_status,'cleared'), 'Refund: '||COALESCE(NEW.refund_status,'cleared'), NEW.amount, NULL,
        jsonb_build_object('refund_status',OLD.refund_status), jsonb_build_object('refund_status',NEW.refund_status,'payment_id',NEW.id));
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS payments_fin_audit ON public.payments;
CREATE TRIGGER payments_fin_audit AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_payment_fin_audit();

-- commission status audit
CREATE OR REPLACE FUNCTION public.tg_commission_fin_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM private.deal_audit(NEW.deal_id, NULL, 'commission_created', 'Commission record created', NEW.amount, NULL, NULL,
      jsonb_build_object('rate',NEW.rate,'status',NEW.status));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM private.deal_audit(NEW.deal_id, NULL, 'commission_status_changed', 'Commission status changed', NEW.amount, NULL,
      jsonb_build_object('status',OLD.status), jsonb_build_object('status',NEW.status));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS commission_fin_audit ON public.deal_commissions;
CREATE TRIGGER commission_fin_audit AFTER INSERT OR UPDATE ON public.deal_commissions
  FOR EACH ROW EXECUTE FUNCTION public.tg_commission_fin_audit();

-- test payments now carry deal/type/test columns (logic otherwise unchanged)
CREATE OR REPLACE FUNCTION public.simulate_test_payment(_deal_id uuid)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_pay uuid; n int := 0; it record; d public.deals%ROWTYPE;
BEGIN
  IF NOT public.payment_test_mode_enabled() THEN RAISE EXCEPTION 'Test payment mode is off, or you are not an admin.'; END IF;
  SELECT * INTO d FROM public.deals WHERE id=_deal_id FOR UPDATE;
  IF d.stage::text <> 'payment' THEN RAISE EXCEPTION 'The deal must be at the payment step.'; END IF;
  FOR it IN SELECT * FROM public.deal_payment_items WHERE deal_id=_deal_id AND status IN ('pending','processing','failed') AND amount > 0 FOR UPDATE LOOP
    INSERT INTO public.payments(user_id, provider, amount, currency, status, reference, purpose, metadata, paid_at, deal_id, payment_type, is_test)
    VALUES (auth.uid(), 'test_mode', it.amount, it.currency, 'paid', 'TEST-'||upper(substr(md5(random()::text),1,10)), 'deal_test',
      jsonb_build_object('test', true, 'deal_id', _deal_id, 'item', it.kind, 'note', 'Test payment — not a real payment'), now(),
      _deal_id, it.kind, true)
    RETURNING id INTO v_pay;
    UPDATE public.deal_payment_items SET is_test=true, payment_id=v_pay, status='paid' WHERE id=it.id;
    n := n + 1;
  END LOOP;
  PERFORM public.advance_deal(_deal_id);
  RETURN n;
END $function$;

-- refund workflow foundation (no provider calls)
CREATE OR REPLACE FUNCTION public.admin_refund_action(_payment_id uuid, _action text, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','private' AS $$
DECLARE p public.payments%ROWTYPE;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN RAISE EXCEPTION 'not authorised'; END IF;
  IF _action NOT IN ('requested','processing','refunded','failed') THEN RAISE EXCEPTION 'invalid refund action'; END IF;
  SELECT * INTO p FROM public.payments WHERE id=_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found.'; END IF;
  IF p.status NOT IN ('paid','succeeded','refunded') THEN RAISE EXCEPTION 'Only paid payments can be refunded.'; END IF;
  IF _action = 'requested' AND p.refund_status IS NOT NULL AND p.refund_status <> 'failed' THEN RAISE EXCEPTION 'A refund is already in progress.'; END IF;
  IF _action IN ('processing','refunded','failed') AND p.refund_status NOT IN ('requested','processing') THEN RAISE EXCEPTION 'Request the refund first.'; END IF;
  UPDATE public.payments SET refund_status=_action,
    status = CASE WHEN _action='refunded' THEN 'refunded' ELSE status END,
    refunded_at = CASE WHEN _action='refunded' THEN now() ELSE refunded_at END,
    failure_reason = CASE WHEN _action='failed' THEN COALESCE(_note, failure_reason) ELSE failure_reason END,
    updated_at=now()
  WHERE id=_payment_id;
  PERFORM private.audit_log('refund_'||_action,'payment',p.id,p.reference,_note,
    jsonb_build_object('from',p.refund_status,'to',_action,'amount',p.amount,'test',p.is_test));
END $$;
REVOKE ALL ON FUNCTION public.admin_refund_action(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_refund_action(uuid,text,text) TO authenticated;

-- revenue summary: estimated / pending / collected kept separate, test excluded
CREATE OR REPLACE FUNCTION public.admin_finance_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN RAISE EXCEPTION 'not authorised'; END IF;
  SELECT jsonb_build_object(
    'transaction_value', COALESCE((SELECT sum(agreed_price) FROM public.deals WHERE agreed_price IS NOT NULL AND stage::text <> 'cancelled'),0),
    'estimated_revenue', COALESCE((SELECT sum(COALESCE(estimated_spaces_fee,0)) FROM public.deals WHERE agreed_price IS NOT NULL AND stage::text <> 'cancelled'),0),
    'pending_revenue', COALESCE((SELECT sum(amount) FROM public.deal_payment_items WHERE kind='spaces_fee' AND status IN ('pending','processing')),0),
    'collected_revenue', COALESCE((SELECT sum(amount) FROM public.payments WHERE NOT is_test AND status IN ('paid','succeeded') AND refund_status IS DISTINCT FROM 'refunded' AND (payment_type='spaces_fee' OR deal_id IS NULL)),0),
    'test_collected', COALESCE((SELECT sum(amount) FROM public.payments WHERE is_test AND status IN ('paid','succeeded')),0),
    'taxes', COALESCE((SELECT sum(COALESCE(spaces_fee_tax,0)) FROM public.deals WHERE agreed_price IS NOT NULL AND stage::text <> 'cancelled'),0),
    'commissions', COALESCE((SELECT sum(amount) FROM public.deal_commissions WHERE status <> 'cancelled'),0),
    'failed_count', (SELECT count(*) FROM public.payments WHERE status='failed'),
    'failed_amount', COALESCE((SELECT sum(amount) FROM public.payments WHERE status='failed'),0),
    'refund_count', (SELECT count(*) FROM public.payments WHERE refund_status IS NOT NULL),
    'refunded_amount', COALESCE((SELECT sum(amount) FROM public.payments WHERE refund_status='refunded' AND NOT is_test),0)
  ) INTO r;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.admin_finance_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_finance_summary() TO authenticated;

-- buyers can read payments recorded against their deal (e.g. receipts)
DROP POLICY IF EXISTS "deal parties view deal payments" ON public.payments;
CREATE POLICY "deal parties view deal payments" ON public.payments FOR SELECT TO authenticated
USING (deal_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.deals d WHERE d.id = payments.deal_id AND (d.buyer_id = auth.uid() OR d.owner_id = auth.uid() OR d.agent_id = auth.uid())));
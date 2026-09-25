CREATE OR REPLACE FUNCTION private.tg_payment_notify() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d record; v_amt text; a uuid; v_test text;
BEGIN
  IF NEW.deal_id IS NULL THEN RETURN NEW; END IF;
  SELECT id, buyer_id, owner_id, agent_id, stage INTO d FROM public.deals WHERE id = NEW.deal_id;
  IF d.id IS NULL THEN RETURN NEW; END IF;
  v_amt := NEW.currency || ' ' || to_char(COALESCE(NEW.amount,0),'FM999,999,999,999');
  v_test := CASE WHEN NEW.is_test THEN ' (TEST MODE)' ELSE '' END;

  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    PERFORM private.notify(d.buyer_id,'payment_due','Payment due', v_amt, d.id, 'pdue:'||NEW.id);
  END IF;

  IF NEW.status IN ('paid','succeeded') AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM private.notify(d.buyer_id,'payment_successful','Payment successful'||v_test, v_amt, d.id, 'pok:'||NEW.id);
    PERFORM private.notify(d.owner_id,'payment_progress','Deal payment received'||v_test, v_amt, d.id, 'pprog:'||NEW.id);
  END IF;

  IF NEW.status = 'failed' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM private.notify(d.buyer_id,'payment_failed','Payment failed', v_amt, d.id, 'pfail:'||NEW.id);
    FOR a IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','super_admin') LOOP
      PERFORM private.notify(a,'admin_payment_failed','Failed payment', v_amt, d.id, 'apfail:'||NEW.id||':'||a);
    END LOOP;
  END IF;

  IF TG_OP='UPDATE' AND NEW.refund_status IS DISTINCT FROM OLD.refund_status AND NEW.refund_status IS NOT NULL THEN
    PERFORM private.notify(d.buyer_id,'refund_update','Refund: '||NEW.refund_status, v_amt, d.id, 'rf:'||NEW.id||':'||NEW.refund_status);
    FOR a IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','super_admin') LOOP
      PERFORM private.notify(a,'admin_refund','Refund '||NEW.refund_status, v_amt, d.id, 'arf:'||NEW.id||':'||NEW.refund_status||':'||a);
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS payments_notify ON public.payments;
CREATE TRIGGER payments_notify AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION private.tg_payment_notify();

CREATE OR REPLACE FUNCTION private.tg_commission_paid_notify() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    PERFORM private.notify(NEW.agent_id,'commission_paid','Commission paid',
      NEW.currency||' '||to_char(COALESCE(NEW.amount,0),'FM999,999,999,999'), NEW.deal_id, 'cpaid:'||NEW.id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS deal_commissions_paid_notify ON public.deal_commissions;
CREATE TRIGGER deal_commissions_paid_notify AFTER UPDATE ON public.deal_commissions
FOR EACH ROW EXECUTE FUNCTION private.tg_commission_paid_notify();
CREATE OR REPLACE FUNCTION public.process_rent_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE c record; r record; tu uuid; n integer := 0; ptitle text; amt text;
BEGIN
  -- Rent due within 3 days
  FOR c IN SELECT * FROM public.rent_charges
    WHERE status IN ('unpaid','partial') AND due_date BETWEEN current_date AND current_date + 3 LOOP
    SELECT user_id INTO tu FROM public.tenants WHERE id = c.tenant_id;
    IF tu IS NOT NULL THEN
      amt := 'TZS ' || to_char(c.amount_due - c.amount_paid, 'FM999,999,999,999');
      PERFORM private.notify(tu, 'rent_due', 'Rent due soon', amt || ' due ' || c.due_date, NULL, 'rent-due-' || c.id);
      n := n + 1;
    END IF;
  END LOOP;
  -- Overdue
  FOR c IN UPDATE public.rent_charges SET status = 'overdue'
    WHERE status IN ('unpaid','partial') AND due_date < current_date AND amount_paid < amount_due
    RETURNING * LOOP
    SELECT title INTO ptitle FROM public.properties WHERE id = c.property_id;
    amt := 'TZS ' || to_char(c.amount_due - c.amount_paid, 'FM999,999,999,999');
    SELECT user_id INTO tu FROM public.tenants WHERE id = c.tenant_id;
    IF tu IS NOT NULL THEN
      PERFORM private.notify(tu, 'rent_overdue', 'Rent overdue', amt || ' was due ' || c.due_date, NULL, 'rent-od-' || c.id || '-' || tu);
    END IF;
    PERFORM private.notify(c.owner_id, 'rent_overdue', 'Rent overdue', coalesce(ptitle,'Property') || ': ' || amt, NULL, 'rent-od-' || c.id || '-' || c.owner_id);
    FOR r IN SELECT manager_id FROM public.property_managers WHERE property_id = c.property_id AND status = 'active' LOOP
      PERFORM private.notify(r.manager_id, 'rent_overdue', 'Rent overdue', coalesce(ptitle,'Property') || ': ' || amt, NULL, 'rent-od-' || c.id || '-' || r.manager_id);
    END LOOP;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.process_rent_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_rent_reminders() TO service_role;

DO $$ BEGIN
  PERFORM cron.unschedule('spaces-rent-reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'spaces-rent-reminders');
  PERFORM cron.schedule('spaces-rent-reminders', '0 5 * * *', 'select public.process_rent_reminders()');
END $$;
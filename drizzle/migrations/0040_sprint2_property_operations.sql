-- Buildings
CREATE TABLE public.property_buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  floors integer,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_buildings TO authenticated;
GRANT ALL ON public.property_buildings TO service_role;
ALTER TABLE public.property_buildings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buildings manage" ON public.property_buildings FOR ALL TO authenticated
  USING (public.can_manage_property(property_id))
  WITH CHECK (public.can_manage_property(property_id) AND owner_id = public.owner_of_property(property_id));
CREATE POLICY "buildings manager read" ON public.property_buildings FOR SELECT TO authenticated
  USING (public.is_active_manager(property_id));
CREATE INDEX property_buildings_property_idx ON public.property_buildings(property_id);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.property_buildings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Units: building, floor, size, reserved status
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS building_id uuid REFERENCES public.property_buildings(id) ON DELETE SET NULL;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS floor text;
ALTER TABLE public.property_units ADD COLUMN IF NOT EXISTS size_sqm numeric;
ALTER TABLE public.property_units DROP CONSTRAINT property_units_occupancy_status_check;
ALTER TABLE public.property_units ADD CONSTRAINT property_units_occupancy_status_check
  CHECK (occupancy_status = ANY (ARRAY['vacant','occupied','reserved','notice_given','maintenance','ready','available']));

-- Maintenance: building, photos, cancelled
ALTER TABLE public.maintenance_tickets ADD COLUMN IF NOT EXISTS building_id uuid REFERENCES public.property_buildings(id) ON DELETE SET NULL;
ALTER TABLE public.maintenance_tickets ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.maintenance_tickets DROP CONSTRAINT maintenance_tickets_status_check;
ALTER TABLE public.maintenance_tickets ADD CONSTRAINT maintenance_tickets_status_check
  CHECK (status = ANY (ARRAY['new','reviewing','approved','assigned','in_progress','completed','closed','rejected','cancelled']));

-- Expenses
CREATE TABLE public.property_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  building_id uuid REFERENCES public.property_buildings(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.property_units(id) ON DELETE SET NULL,
  owner_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('maintenance','utilities','security','cleaning','management','repairs','taxes','other')),
  supplier text,
  description text,
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'TZS',
  expense_date date NOT NULL DEFAULT current_date,
  receipt_path text,
  notes text,
  recorded_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_expenses TO authenticated;
GRANT ALL ON public.property_expenses TO service_role;
ALTER TABLE public.property_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses manage" ON public.property_expenses FOR ALL TO authenticated
  USING (public.can_manage_property(property_id))
  WITH CHECK (public.can_manage_property(property_id) AND owner_id = public.owner_of_property(property_id));
CREATE POLICY "expenses manager read" ON public.property_expenses FOR SELECT TO authenticated
  USING (public.is_active_manager(property_id));
CREATE INDEX property_expenses_property_idx ON public.property_expenses(property_id, expense_date DESC);
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.property_expenses FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Maintenance notifications
CREATE OR REPLACE FUNCTION private.tg_maintenance_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE r record; tenant_user uuid; ptitle text;
BEGIN
  SELECT title INTO ptitle FROM public.properties WHERE id = NEW.property_id;
  IF TG_OP = 'INSERT' THEN
    IF NEW.owner_id IS DISTINCT FROM NEW.reported_by THEN
      PERFORM private.notify(NEW.owner_id, 'maintenance_request', 'New maintenance request',
        coalesce(ptitle,'Property') || ': ' || left(NEW.description, 120), NULL, 'mt-new-' || NEW.id || '-' || NEW.owner_id);
    END IF;
    FOR r IN SELECT manager_id FROM public.property_managers WHERE property_id = NEW.property_id AND status = 'active' LOOP
      IF r.manager_id IS DISTINCT FROM NEW.reported_by THEN
        PERFORM private.notify(r.manager_id, 'maintenance_request', 'New maintenance request',
          coalesce(ptitle,'Property') || ': ' || left(NEW.description, 120), NULL, 'mt-new-' || NEW.id || '-' || r.manager_id);
      END IF;
    END LOOP;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.tenant_id IS NOT NULL THEN
      SELECT user_id INTO tenant_user FROM public.tenants WHERE id = NEW.tenant_id;
      IF tenant_user IS NOT NULL THEN
        PERFORM private.notify(tenant_user, 'maintenance_update', 'Maintenance update',
          coalesce(ptitle,'Property') || ': ' || replace(NEW.status,'_',' '), NULL, 'mt-st-' || NEW.id || '-' || NEW.status || '-' || tenant_user);
      END IF;
    END IF;
    IF NEW.status IN ('completed','closed') THEN
      PERFORM private.notify(NEW.owner_id, 'maintenance_completed', 'Maintenance completed',
        coalesce(ptitle,'Property') || ': ' || left(NEW.description, 120), NULL, 'mt-done-' || NEW.id || '-' || NEW.owner_id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER maintenance_notify AFTER INSERT OR UPDATE OF status ON public.maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION private.tg_maintenance_notify();

-- New tenant notification to managers
CREATE OR REPLACE FUNCTION private.tg_tenant_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT manager_id FROM public.property_managers WHERE property_id = NEW.property_id AND status = 'active' LOOP
    IF r.manager_id IS DISTINCT FROM auth.uid() THEN
      PERFORM private.notify(r.manager_id, 'new_tenant', 'New tenant added', NEW.full_name, NULL, 'tn-new-' || NEW.id || '-' || r.manager_id);
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER tenant_notify AFTER INSERT ON public.tenants FOR EACH ROW EXECUTE FUNCTION private.tg_tenant_notify();
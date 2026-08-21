CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  visitor_id UUID,
  visitor_name TEXT,
  visitor_phone TEXT,
  visitor_email TEXT,
  contact_method TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX leads_owner_id_idx ON public.leads(owner_id);
CREATE INDEX leads_property_id_idx ON public.leads(property_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and visitors can view their leads"
  ON public.leads FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR visitor_id = auth.uid());

CREATE POLICY "Authenticated visitors can create leads"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (visitor_id = auth.uid());

CREATE POLICY "Owners can update their leads"
  ON public.leads FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete their leads"
  ON public.leads FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE TRIGGER set_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
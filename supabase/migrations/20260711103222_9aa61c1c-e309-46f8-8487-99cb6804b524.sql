
CREATE TABLE public.agent_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  client_type TEXT NOT NULL DEFAULT 'buyer' CHECK (client_type IN ('buyer','owner')),
  budget NUMERIC,
  currency TEXT DEFAULT 'TZS',
  preferred_area TEXT,
  interested_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  notes TEXT,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_clients TO authenticated;
GRANT ALL ON public.agent_clients TO service_role;

ALTER TABLE public.agent_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents read own clients"
ON public.agent_clients FOR SELECT TO authenticated
USING (auth.uid() = agent_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents insert own clients"
ON public.agent_clients FOR INSERT TO authenticated
WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents update own clients"
ON public.agent_clients FOR UPDATE TO authenticated
USING (auth.uid() = agent_id)
WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents delete own clients"
ON public.agent_clients FOR DELETE TO authenticated
USING (auth.uid() = agent_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_agent_clients_updated_at
BEFORE UPDATE ON public.agent_clients
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_agent_clients_agent ON public.agent_clients(agent_id);
CREATE INDEX idx_agent_clients_created ON public.agent_clients(created_at DESC);

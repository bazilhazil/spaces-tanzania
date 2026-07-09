
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications(user_id, created_at DESC);

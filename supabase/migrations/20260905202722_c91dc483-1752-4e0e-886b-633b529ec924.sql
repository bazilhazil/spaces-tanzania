ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS parking_available boolean NOT NULL DEFAULT false;
UPDATE public.properties SET parking_available = true WHERE COALESCE(parking, 0) > 0;
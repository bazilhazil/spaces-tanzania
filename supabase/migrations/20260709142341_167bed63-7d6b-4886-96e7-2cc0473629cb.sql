ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'paused';
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'sold';
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'rented';
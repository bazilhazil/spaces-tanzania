CREATE OR REPLACE FUNCTION public.public_dalali_extras(_id uuid)
RETURNS TABLE(areas_served text[], services text[], experience_years integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.areas_served, p.services, p.experience_years FROM public.profiles p WHERE p.id = _id
$$;
GRANT EXECUTE ON FUNCTION public.public_dalali_extras(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_verification_submitted() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_verification_reviewed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_property_report_notify() FROM PUBLIC, anon, authenticated;
-- Data API grants must match the RLS policies that already exist; without them
-- owner/admin update and delete paths fail with a permission error.
grant update on public.profiles to authenticated;
grant update on public.properties to authenticated;
grant delete on public.properties to authenticated;
grant update on public.subscriptions to authenticated;
grant delete on public.bookings to authenticated;
grant delete on public.deals to authenticated;

-- profiles has no DELETE policy; remove the dangling privilege.
revoke delete on public.profiles from authenticated;
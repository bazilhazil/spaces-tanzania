-- Users must not be able to grant themselves verification badges or lift their
-- own suspension by updating their profile row.
create or replace function public.tg_guard_profile_trust()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or public.has_role(auth.uid(), 'admin'::app_role)
     or public.has_role(auth.uid(), 'super_admin'::app_role) then
    return new;
  end if;

  new.verified_identity := old.verified_identity;
  new.verified_owner    := old.verified_owner;
  new.verified_agent    := old.verified_agent;
  new.verified_business := old.verified_business;
  new.account_status    := old.account_status;
  new.suspension_reason := old.suspension_reason;
  new.suspended_until   := old.suspended_until;
  return new;
end;
$$;

revoke all on function public.tg_guard_profile_trust() from public, anon, authenticated;

drop trigger if exists profiles_guard_trust on public.profiles;
create trigger profiles_guard_trust
before update on public.profiles
for each row execute function public.tg_guard_profile_trust();
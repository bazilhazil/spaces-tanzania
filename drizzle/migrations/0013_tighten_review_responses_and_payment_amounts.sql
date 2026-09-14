-- 1. Only agents with real management rights may publish an official response.
drop policy if exists "Subjects respond to reviews" on public.reviews;
create policy "Subjects respond to reviews"
on public.reviews for update to authenticated
using (
  status = 'published'::review_status
  and (
    subject_user_id = auth.uid()
    or (property_id is not null and (
      exists (select 1 from properties p where p.id = reviews.property_id and p.owner_id = auth.uid())
      or private.agent_permission_for(reviews.property_id, auth.uid())
           in ('edit_listing'::agent_permission, 'full_management'::agent_permission)
    ))
  )
)
with check (
  status = 'published'::review_status
  and response_by = auth.uid()
  and (
    subject_user_id = auth.uid()
    or (property_id is not null and (
      exists (select 1 from properties p where p.id = reviews.property_id and p.owner_id = auth.uid())
      or private.agent_permission_for(reviews.property_id, auth.uid())
           in ('edit_listing'::agent_permission, 'full_management'::agent_permission)
    ))
  )
);

-- 2. A self-created payment intent must match the real catalogue price.
create or replace function public.tg_guard_payment_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare expected numeric; cur text;
begin
  if auth.uid() is null
     or public.has_role(auth.uid(), 'admin'::app_role)
     or public.has_role(auth.uid(), 'super_admin'::app_role) then
    return new;
  end if;

  if new.plan_id is not null then
    select case when new.billing_cycle = 'annual' then price_annual else price_monthly end, currency
      into expected, cur
      from public.billing_plans where id = new.plan_id and active;
    if expected is null then
      raise exception 'PAYMENT_PLAN_INVALID';
    end if;
    new.amount := expected;
    new.currency := cur;
  elsif new.purpose = 'promotion' then
    select price, currency into expected, cur
      from public.promotion_products
      where id = coalesce(new.metadata->>'product_id', '') and active;
    if expected is null then
      raise exception 'PAYMENT_PRODUCT_INVALID';
    end if;
    new.amount := expected;
    new.currency := cur;
  end if;

  return new;
end;
$$;

revoke all on function public.tg_guard_payment_amount() from public, anon, authenticated;

drop trigger if exists payments_guard_amount on public.payments;
create trigger payments_guard_amount
before insert on public.payments
for each row execute function public.tg_guard_payment_amount();
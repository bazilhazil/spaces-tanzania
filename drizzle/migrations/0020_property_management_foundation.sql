-- SPACES property management foundation (additive only)

create or replace function public.can_manage_property(_property_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.properties p
    where p.id = _property_id
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1 from public.property_agents pa
          where pa.property_id = p.id and pa.agent_id = auth.uid()
            and pa.permission = 'full_management'
        )
      )
  )
  or public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'super_admin');
$$;

create or replace function public.owner_of_property(_property_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select owner_id from public.properties where id = _property_id;
$$;

create table if not exists public.property_units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  owner_id uuid not null,
  name text not null,
  unit_type text,
  bedrooms integer,
  bathrooms integer,
  rent_amount numeric,
  deposit_amount numeric,
  service_charge numeric,
  currency text not null default 'TZS',
  occupancy_status text not null default 'vacant'
    check (occupancy_status in ('vacant','occupied','notice_given','maintenance','ready','available')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, name)
);
create index if not exists idx_property_units_property on public.property_units(property_id);

create table if not exists public.contractors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  company text,
  phone text,
  email text,
  service_category text,
  location text,
  notes text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_contractors_owner on public.contractors(owner_id);

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.property_units(id) on delete set null,
  user_id uuid,
  full_name text not null,
  phone text,
  email text,
  avatar_url text,
  id_document_ref text,
  emergency_name text,
  emergency_phone text,
  notes text,
  status text not null default 'active' check (status in ('active','notice','past')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tenants_property on public.tenants(property_id);
create index if not exists idx_tenants_user on public.tenants(user_id);

create table if not exists public.leases (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.property_units(id) on delete set null,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_id uuid not null,
  manager_id uuid,
  start_date date not null,
  end_date date,
  renewal_date date,
  notice_period_days integer default 30,
  monthly_rent numeric not null default 0,
  deposit_amount numeric,
  service_charge numeric,
  currency text not null default 'TZS',
  payment_frequency text not null default 'monthly'
    check (payment_frequency in ('monthly','quarterly','biannual','annual')),
  late_fee_type text not null default 'none' check (late_fee_type in ('none','fixed','percent')),
  late_fee_value numeric,
  late_fee_grace_days integer default 0,
  special_terms text,
  document_path text,
  signed_document_path text,
  status text not null default 'draft'
    check (status in ('draft','active','expiring','expired','terminated','renewed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_leases_property on public.leases(property_id);
create index if not exists idx_leases_tenant on public.leases(tenant_id);

create table if not exists public.rent_charges (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.property_units(id) on delete set null,
  owner_id uuid not null,
  period_start date,
  period_end date,
  due_date date not null,
  amount_due numeric not null default 0,
  amount_paid numeric not null default 0,
  currency text not null default 'TZS',
  status text not null default 'unpaid' check (status in ('unpaid','partial','paid','overdue')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_rent_charges_lease on public.rent_charges(lease_id);
create index if not exists idx_rent_charges_tenant on public.rent_charges(tenant_id);

create table if not exists public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  charge_id uuid not null references public.rent_charges(id) on delete cascade,
  lease_id uuid not null references public.leases(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  owner_id uuid not null,
  amount numeric not null,
  currency text not null default 'TZS',
  method text not null default 'mobile_money'
    check (method in ('mobile_money','bank_transfer','cash','other')),
  reference text,
  paid_at timestamptz,
  proof_path text,
  receipt_path text,
  status text not null default 'pending_verification'
    check (status in ('pending_verification','approved','rejected')),
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  recorded_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_rent_payments_charge on public.rent_payments(charge_id);

create table if not exists public.maintenance_tickets (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.property_units(id) on delete set null,
  lease_id uuid references public.leases(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  owner_id uuid not null,
  contractor_id uuid references public.contractors(id) on delete set null,
  reported_by uuid,
  category text not null default 'other',
  description text not null,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'new'
    check (status in ('new','reviewing','approved','assigned','in_progress','completed','closed','rejected')),
  estimated_cost numeric,
  approved_cost numeric,
  actual_cost numeric,
  currency text not null default 'TZS',
  notes text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_maintenance_property on public.maintenance_tickets(property_id);
create index if not exists idx_maintenance_tenant on public.maintenance_tickets(tenant_id);

create table if not exists public.management_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  property_id uuid references public.properties(id) on delete cascade,
  unit_id uuid references public.property_units(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete cascade,
  lease_id uuid references public.leases(id) on delete cascade,
  charge_id uuid references public.rent_charges(id) on delete cascade,
  payment_id uuid references public.rent_payments(id) on delete cascade,
  ticket_id uuid references public.maintenance_tickets(id) on delete cascade,
  doc_type text not null default 'other'
    check (doc_type in ('lease','proof_of_payment','receipt','identification','maintenance','notice','other')),
  name text not null,
  storage_path text not null,
  mime_type text,
  size bigint,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_management_documents_property on public.management_documents(property_id);

do $$
declare t text;
begin
  foreach t in array array['property_units','contractors','tenants','leases','rent_charges','rent_payments','maintenance_tickets']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.tg_set_updated_at()', t);
  end loop;
end $$;

create or replace function public.is_my_tenancy(_tenant_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tenants t where t.id = _tenant_id and t.user_id = auth.uid());
$$;

grant select, insert, update, delete on public.property_units to authenticated;
grant select, insert, update, delete on public.contractors to authenticated;
grant select, insert, update, delete on public.tenants to authenticated;
grant select, insert, update, delete on public.leases to authenticated;
grant select, insert, update, delete on public.rent_charges to authenticated;
grant select, insert, update, delete on public.rent_payments to authenticated;
grant select, insert, update, delete on public.maintenance_tickets to authenticated;
grant select, insert, update, delete on public.management_documents to authenticated;
grant all on public.property_units, public.contractors, public.tenants, public.leases,
  public.rent_charges, public.rent_payments, public.maintenance_tickets, public.management_documents
  to service_role;

alter table public.property_units enable row level security;
alter table public.contractors enable row level security;
alter table public.tenants enable row level security;
alter table public.leases enable row level security;
alter table public.rent_charges enable row level security;
alter table public.rent_payments enable row level security;
alter table public.maintenance_tickets enable row level security;
alter table public.management_documents enable row level security;

create policy "units manage" on public.property_units for all to authenticated
  using (public.can_manage_property(property_id))
  with check (public.can_manage_property(property_id) and owner_id = public.owner_of_property(property_id));
create policy "units tenant read" on public.property_units for select to authenticated
  using (exists (select 1 from public.tenants t where t.unit_id = property_units.id and t.user_id = auth.uid()));

create policy "contractors own" on public.contractors for all to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'))
  with check (owner_id = auth.uid());

create policy "tenants manage" on public.tenants for all to authenticated
  using (public.can_manage_property(property_id))
  with check (public.can_manage_property(property_id) and owner_id = public.owner_of_property(property_id));
create policy "tenants self read" on public.tenants for select to authenticated
  using (user_id = auth.uid());

create policy "leases manage" on public.leases for all to authenticated
  using (public.can_manage_property(property_id))
  with check (public.can_manage_property(property_id) and owner_id = public.owner_of_property(property_id));
create policy "leases tenant read" on public.leases for select to authenticated
  using (public.is_my_tenancy(tenant_id));

create policy "charges manage" on public.rent_charges for all to authenticated
  using (public.can_manage_property(property_id))
  with check (public.can_manage_property(property_id) and owner_id = public.owner_of_property(property_id));
create policy "charges tenant read" on public.rent_charges for select to authenticated
  using (public.is_my_tenancy(tenant_id));

create policy "payments manage" on public.rent_payments for all to authenticated
  using (public.can_manage_property(property_id))
  with check (public.can_manage_property(property_id) and owner_id = public.owner_of_property(property_id));
create policy "payments tenant read" on public.rent_payments for select to authenticated
  using (public.is_my_tenancy(tenant_id));
create policy "payments tenant submit" on public.rent_payments for insert to authenticated
  with check (
    public.is_my_tenancy(tenant_id)
    and status = 'pending_verification'
    and recorded_by = auth.uid()
    and owner_id = public.owner_of_property(property_id)
  );

create policy "maintenance manage" on public.maintenance_tickets for all to authenticated
  using (public.can_manage_property(property_id))
  with check (public.can_manage_property(property_id) and owner_id = public.owner_of_property(property_id));
create policy "maintenance tenant read" on public.maintenance_tickets for select to authenticated
  using (tenant_id is not null and public.is_my_tenancy(tenant_id));
create policy "maintenance tenant create" on public.maintenance_tickets for insert to authenticated
  with check (
    tenant_id is not null and public.is_my_tenancy(tenant_id)
    and reported_by = auth.uid()
    and status = 'new'
    and owner_id = public.owner_of_property(property_id)
  );

create policy "documents manage" on public.management_documents for all to authenticated
  using (property_id is not null and public.can_manage_property(property_id))
  with check (property_id is not null and public.can_manage_property(property_id));
create policy "documents tenant read" on public.management_documents for select to authenticated
  using (tenant_id is not null and public.is_my_tenancy(tenant_id));
create policy "documents tenant upload" on public.management_documents for insert to authenticated
  with check (tenant_id is not null and public.is_my_tenancy(tenant_id) and uploaded_by = auth.uid());

create or replace function public.tg_rent_payment_apply()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_paid numeric; v_charge uuid;
begin
  v_charge := coalesce(new.charge_id, old.charge_id);
  select coalesce(sum(amount),0) into v_paid
  from public.rent_payments
  where charge_id = v_charge and status = 'approved';

  update public.rent_charges c
     set amount_paid = v_paid,
         status = case
           when v_paid >= c.amount_due and c.amount_due > 0 then 'paid'
           when v_paid > 0 then 'partial'
           when c.due_date < current_date then 'overdue'
           else 'unpaid' end
   where c.id = v_charge;
  return null;
end $$;

drop trigger if exists rent_payment_apply on public.rent_payments;
create trigger rent_payment_apply after insert or update or delete on public.rent_payments
  for each row execute function public.tg_rent_payment_apply();

create policy "management docs read" on storage.objects for select to authenticated
  using (
    bucket_id = 'management-docs'
    and exists (
      select 1 from public.management_documents d
      where d.storage_path = storage.objects.name
        and (
          d.uploaded_by = auth.uid()
          or (d.property_id is not null and public.can_manage_property(d.property_id))
          or (d.tenant_id is not null and public.is_my_tenancy(d.tenant_id))
        )
    )
  );
create policy "management docs write" on storage.objects for insert to authenticated
  with check (bucket_id = 'management-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "management docs delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'management-docs' and (storage.foldername(name))[1] = auth.uid()::text);

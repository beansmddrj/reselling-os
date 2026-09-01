-- Incoming shipments are operational records. Their financial data lives in a
-- separate owner-only table so teammates can collaborate without seeing costs.

create table public.inbound_shipments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  supplier_name text,
  supplier_order_reference text,
  status text not null default 'ordered' check (status in ('ordered', 'preparing', 'shipped', 'in_transit', 'delivered', 'partially_received', 'received', 'delayed', 'issue', 'cancelled')),
  visibility text not null default 'standard' check (visibility in ('standard', 'owner_only')),
  expected_pieces integer not null check (expected_pieces > 0),
  received_pieces integer not null default 0 check (received_pieces >= 0),
  ordered_on date,
  expected_delivery_on date,
  contents text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inbound_shipment_financials (
  shipment_id uuid primary key references public.inbound_shipments(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  purchase_cost_cents bigint not null default 0 check (purchase_cost_cents >= 0),
  shipping_cost_cents bigint not null default 0 check (shipping_cost_cents >= 0),
  tax_cost_cents bigint not null default 0 check (tax_cost_cents >= 0),
  duties_cost_cents bigint not null default 0 check (duties_cost_cents >= 0),
  insurance_cost_cents bigint not null default 0 check (insurance_cost_cents >= 0),
  other_cost_cents bigint not null default 0 check (other_cost_cents >= 0),
  projected_revenue_cents bigint check (projected_revenue_cents is null or projected_revenue_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inbound_packages (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.inbound_shipments(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  carrier text,
  tracking_number text,
  tracking_url text,
  status text not null default 'pending' check (status in ('pending', 'shipped', 'in_transit', 'delivered', 'issue')),
  expected_pieces integer check (expected_pieces is null or expected_pieces > 0),
  received_pieces integer not null default 0 check (received_pieces >= 0),
  estimated_delivery_on date,
  last_tracking_update_at timestamptz,
  last_known_location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (tracking_url is null or tracking_url ~* '^https?://[^[:space:]]+$')
);

create table public.inbound_receipts (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.inbound_shipments(id) on delete cascade,
  package_id uuid references public.inbound_packages(id) on delete set null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  received_pieces integer not null check (received_pieces > 0),
  exception_type text check (exception_type is null or exception_type in ('missing', 'extra', 'damaged', 'wrong_merchandise', 'lost_package', 'supplier_error', 'partial_delivery', 'other')),
  notes text,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.inventory_units add column source_shipment_id uuid references public.inbound_shipments(id) on delete set null;
alter table public.intake_drafts add column source_shipment_id uuid references public.inbound_shipments(id) on delete set null;

create index inbound_shipments_owner_status_idx on public.inbound_shipments(owner_id, status, created_at desc);
create index inbound_packages_shipment_idx on public.inbound_packages(shipment_id, created_at);
create index inbound_receipts_shipment_idx on public.inbound_receipts(shipment_id, received_at desc);
create index inventory_units_source_shipment_idx on public.inventory_units(source_shipment_id);

create trigger inbound_shipments_set_updated_at before update on public.inbound_shipments for each row execute function public.set_updated_at();
create trigger inbound_shipment_financials_set_updated_at before update on public.inbound_shipment_financials for each row execute function public.set_updated_at();
create trigger inbound_packages_set_updated_at before update on public.inbound_packages for each row execute function public.set_updated_at();

alter table public.inbound_shipments enable row level security;
alter table public.inbound_shipment_financials enable row level security;
alter table public.inbound_packages enable row level security;
alter table public.inbound_receipts enable row level security;

revoke all on table public.inbound_shipments, public.inbound_shipment_financials, public.inbound_packages, public.inbound_receipts from public, anon;
grant select on table public.inbound_shipments, public.inbound_packages, public.inbound_receipts to authenticated;
grant insert, update, delete on table public.inbound_shipments, public.inbound_shipment_financials, public.inbound_packages, public.inbound_receipts to authenticated;
grant select on table public.inbound_shipment_financials to authenticated;

create policy "inbound_shipments_team_read" on public.inbound_shipments for select to authenticated
using (owner_id in (select private.accessible_business_owner_ids()) and (visibility = 'standard' or owner_id = (select auth.uid())));
create policy "inbound_shipments_owner_write" on public.inbound_shipments for all to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy "inbound_financials_owner_only" on public.inbound_shipment_financials for all to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy "inbound_packages_team_read" on public.inbound_packages for select to authenticated
using (exists (select 1 from public.inbound_shipments shipment where shipment.id = shipment_id and shipment.owner_id in (select private.accessible_business_owner_ids()) and (shipment.visibility = 'standard' or shipment.owner_id = (select auth.uid()))));
create policy "inbound_packages_owner_write" on public.inbound_packages for all to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy "inbound_receipts_team_read" on public.inbound_receipts for select to authenticated
using (exists (select 1 from public.inbound_shipments shipment where shipment.id = shipment_id and shipment.owner_id in (select private.accessible_business_owner_ids()) and (shipment.visibility = 'standard' or shipment.owner_id = (select auth.uid()))));
create policy "inbound_receipts_owner_write" on public.inbound_receipts for all to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create or replace function public.finalize_intake_draft(draft_id uuid)
returns table (product_id uuid, inventory_unit_id uuid, listing_id uuid)
language plpgsql set search_path = '' as $$
declare draft public.intake_drafts; new_product_id uuid; new_inventory_unit_id uuid; new_listing_id uuid; photo_path text; photo_position integer := 0;
begin
  select * into draft from public.intake_drafts where id = draft_id and owner_id in (select private.accessible_business_owner_ids()) for update;
  if not found then raise exception 'Intake draft not found'; end if;
  if trim(draft.name) = '' then raise exception 'Product name is required'; end if;
  if draft.acquisition_cost_cents is null then raise exception 'Acquisition cost is required'; end if;
  if draft.asking_price_cents is null then raise exception 'Asking price is required'; end if;
  if coalesce(array_length(draft.photo_paths, 1), 0) < 1 then raise exception 'At least one photo is required'; end if;
  insert into public.products (owner_id, name, brand, category, size, color, condition, description, default_asking_price_cents, default_cost_cents)
  values (draft.owner_id, trim(draft.name), nullif(trim(draft.brand), ''), nullif(trim(draft.category), ''), nullif(trim(draft.size), ''), nullif(trim(draft.color), ''), nullif(trim(draft.condition), ''), nullif(trim(draft.description), ''), draft.asking_price_cents, draft.acquisition_cost_cents) returning id into new_product_id;
  insert into public.inventory_units (owner_id, product_id, sku, status, acquisition_cost_cents, storage_location, source_shipment_id)
  values (draft.owner_id, new_product_id, 'ROS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), 'draft', draft.acquisition_cost_cents, nullif(trim(draft.storage_location), ''), draft.source_shipment_id) returning id into new_inventory_unit_id;
  insert into public.listings (owner_id, product_id, platform, status, title, description, asking_price_cents)
  values (draft.owner_id, new_product_id, 'facebook', 'draft', trim(draft.name), nullif(trim(draft.description), ''), draft.asking_price_cents) returning id into new_listing_id;
  foreach photo_path in array draft.photo_paths loop insert into public.product_photos (owner_id, product_id, storage_path, position) values (draft.owner_id, new_product_id, photo_path, photo_position); photo_position := photo_position + 1; end loop;
  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata) values (draft.owner_id, 'intake_draft_finalized', 'product', new_product_id, jsonb_build_object('inventory_unit_id', new_inventory_unit_id, 'listing_id', new_listing_id, 'source_shipment_id', draft.source_shipment_id, 'actor_id', auth.uid()));
  delete from public.intake_drafts where id = draft.id;
  return query select new_product_id, new_inventory_unit_id, new_listing_id;
end; $$;

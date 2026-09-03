-- v0.1.8 starts treating high-volume stock as a logical quantity instead of
-- creating one inventory_units row for every physical item. Legacy inventory
-- stays exactly as it is; new bulk products use one lightweight anchor unit
-- plus one or more quantity lots.

alter table public.products
  add column inventory_mode text not null default 'unique'
  check (inventory_mode in ('unique', 'repeat', 'bulk'));

update public.products
set inventory_mode = case when is_template then 'repeat' else 'unique' end;

create table public.inventory_lots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  source_shipment_id uuid references public.inbound_shipments(id) on delete set null,
  received_quantity bigint not null check (received_quantity > 0),
  available_quantity bigint not null check (available_quantity >= 0),
  reserved_quantity bigint not null default 0 check (reserved_quantity >= 0),
  damaged_quantity bigint not null default 0 check (damaged_quantity >= 0),
  missing_quantity bigint not null default 0 check (missing_quantity >= 0),
  sold_quantity bigint not null default 0 check (sold_quantity >= 0),
  package_label text,
  package_quantity bigint check (package_quantity is null or package_quantity > 0),
  units_per_package bigint check (units_per_package is null or units_per_package > 0),
  unit_cost_cents bigint not null default 0 check (unit_cost_cents >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    available_quantity + reserved_quantity + damaged_quantity + missing_quantity + sold_quantity
      = received_quantity
  ),
  check (
    (package_quantity is null and units_per_package is null)
    or (package_quantity is not null and units_per_package is not null and package_quantity * units_per_package = received_quantity)
  )
);

create index inventory_lots_business_product_idx
  on public.inventory_lots (business_id, product_id, created_at desc);
create index inventory_lots_shipment_idx
  on public.inventory_lots (source_shipment_id)
  where source_shipment_id is not null;

create trigger inventory_lots_set_updated_at
before update on public.inventory_lots
for each row execute function public.set_updated_at();

alter table public.inventory_lots enable row level security;
revoke all on table public.inventory_lots from public, anon;
grant select, insert, update, delete on table public.inventory_lots to authenticated;

create policy "inventory_lots_business" on public.inventory_lots for all to authenticated
using (business_id in (select private.accessible_business_ids()))
with check (business_id in (select private.accessible_business_ids()));

create function public.create_bulk_inventory_product(
  target_business_id uuid,
  product_name text,
  product_brand text,
  product_category text,
  product_description text,
  product_condition text,
  product_color text,
  product_asking_price_cents bigint,
  product_unit_cost_cents bigint,
  product_storage_location text,
  initial_quantity bigint,
  initial_package_label text default null,
  initial_package_quantity bigint default null,
  initial_units_per_package bigint default null,
  initial_notes text default null,
  initial_source_shipment_id uuid default null
)
returns table (product_id uuid, inventory_unit_id uuid, lot_id uuid, listing_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_business public.businesses;
  new_product_id uuid;
  new_inventory_unit_id uuid;
  new_lot_id uuid;
  new_listing_id uuid;
begin
  if trim(product_name) = '' then raise exception 'Product name is required'; end if;
  if initial_quantity < 1 then raise exception 'Quantity must be at least one'; end if;
  if product_asking_price_cents < 0 or product_unit_cost_cents < 0 then raise exception 'Prices cannot be negative'; end if;
  if (initial_package_quantity is null) <> (initial_units_per_package is null) then
    raise exception 'Enter both packages and units per package, or leave both blank';
  end if;
  if initial_package_quantity is not null and (initial_package_quantity < 1 or initial_units_per_package < 1) then
    raise exception 'Package counts must be at least one';
  end if;
  if initial_package_quantity is not null and initial_package_quantity * initial_units_per_package <> initial_quantity then
    raise exception 'Packages multiplied by units per package must equal total quantity';
  end if;

  select * into target_business
  from public.businesses
  where id = target_business_id
    and id in (select private.accessible_business_ids())
  for update;
  if not found then raise exception 'Business workspace not found'; end if;

  if initial_source_shipment_id is not null and not exists (
    select 1 from public.inbound_shipments
    where id = initial_source_shipment_id and business_id = target_business.id
  ) then
    raise exception 'Shipment is not part of this workspace';
  end if;

  insert into public.products (
    owner_id, business_id, name, brand, category, color, condition, description,
    is_template, inventory_mode, default_asking_price_cents, default_cost_cents
  ) values (
    target_business.owner_id, target_business.id, trim(product_name), nullif(trim(product_brand), ''),
    nullif(trim(product_category), ''), nullif(trim(product_color), ''), nullif(trim(product_condition), ''),
    nullif(trim(product_description), ''), true, 'bulk', product_asking_price_cents, product_unit_cost_cents
  ) returning id into new_product_id;

  -- This anchor keeps bulk products compatible with existing inventory pages.
  -- It is deliberately not sellable; the lot is the stock source of truth.
  insert into public.inventory_units (
    owner_id, business_id, product_id, sku, status, acquisition_cost_cents,
    storage_location, source_shipment_id, is_stock_placeholder
  ) values (
    target_business.owner_id, target_business.id, new_product_id,
    'ROS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    'draft', product_unit_cost_cents, nullif(trim(product_storage_location), ''),
    initial_source_shipment_id, true
  ) returning id into new_inventory_unit_id;

  insert into public.inventory_lots (
    owner_id, business_id, product_id, source_shipment_id, received_quantity,
    available_quantity, package_label, package_quantity, units_per_package,
    unit_cost_cents, notes
  ) values (
    target_business.owner_id, target_business.id, new_product_id, initial_source_shipment_id,
    initial_quantity, initial_quantity, nullif(trim(initial_package_label), ''),
    initial_package_quantity, initial_units_per_package, product_unit_cost_cents,
    nullif(trim(initial_notes), '')
  ) returning id into new_lot_id;

  insert into public.listings (
    owner_id, business_id, product_id, platform, status, title, description, asking_price_cents
  ) values (
    target_business.owner_id, target_business.id, new_product_id, 'facebook', 'draft',
    trim(product_name), nullif(trim(product_description), ''), product_asking_price_cents
  ) returning id into new_listing_id;

  insert into public.business_events (owner_id, business_id, event_type, entity_type, entity_id, metadata)
  values (
    target_business.owner_id, target_business.id, 'bulk_inventory_created', 'inventory_lot', new_lot_id,
    jsonb_build_object(
      'product_id', new_product_id,
      'inventory_unit_id', new_inventory_unit_id,
      'listing_id', new_listing_id,
      'quantity', initial_quantity,
      'actor_id', auth.uid()
    )
  );

  return query select new_product_id, new_inventory_unit_id, new_lot_id, new_listing_id;
end;
$$;

revoke execute on function public.create_bulk_inventory_product(uuid, text, text, text, text, text, text, bigint, bigint, text, bigint, text, bigint, bigint, text, uuid) from public, anon;
grant execute on function public.create_bulk_inventory_product(uuid, text, text, text, text, text, text, bigint, bigint, text, bigint, text, bigint, bigint, text, uuid) to authenticated;

-- A bulk sale is one real transaction that can consume multiple logical units.
alter table public.sales
  drop constraint if exists sales_inventory_unit_id_key;
alter table public.sales
  add column quantity bigint not null default 1 check (quantity > 0);

create or replace function private.prevent_stock_placeholder_sale()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.inventory_units unit
    join public.products product on product.id = unit.product_id
    where unit.id = new.inventory_unit_id
      and unit.is_stock_placeholder
      and product.inventory_mode <> 'bulk'
  ) then
    raise exception 'Restock this repeatable listing before recording a sale';
  end if;
  return new;
end;
$$;

drop function public.record_inventory_sale(uuid, public.marketplace_platform, bigint, bigint, bigint, bigint, bigint, timestamptz);

create function public.record_inventory_sale(
  target_unit_id uuid,
  sale_platform public.marketplace_platform,
  sale_price_cents bigint,
  platform_fee_cents bigint,
  payment_fee_cents bigint,
  shipping_cost_cents bigint,
  other_cost_cents bigint,
  sale_sold_at timestamptz,
  sale_quantity bigint default 1
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_unit public.inventory_units;
  target_product public.products;
  target_listing public.listings;
  stock_lot public.inventory_lots;
  new_sale_id uuid;
  replacement_unit_id uuid;
  remaining_quantity bigint;
  quantity_from_lot bigint;
  total_cogs_cents bigint := 0;
begin
  if sale_price_cents <= 0 then raise exception 'Sale price must be greater than zero'; end if;
  if sale_quantity < 1 then raise exception 'Sale quantity must be at least one'; end if;
  if platform_fee_cents < 0 or payment_fee_cents < 0 or shipping_cost_cents < 0 or other_cost_cents < 0 then raise exception 'Sale costs cannot be negative'; end if;
  if sale_sold_at is null or sale_sold_at > now() + interval '5 minutes' then raise exception 'Sold date is invalid'; end if;

  select * into target_unit from public.inventory_units
  where id = target_unit_id and business_id in (select private.accessible_business_ids())
  for update;
  if not found then raise exception 'Inventory item not found'; end if;
  select * into target_product from public.products
  where id = target_unit.product_id and business_id = target_unit.business_id
  for update;
  if not found then raise exception 'Product not found'; end if;
  select * into target_listing from public.listings
  where product_id = target_product.id and business_id = target_product.business_id
  order by created_at desc limit 1 for update;

  if target_product.inventory_mode = 'bulk' then
    remaining_quantity := sale_quantity;
    for stock_lot in
      select * from public.inventory_lots
      where product_id = target_product.id
        and business_id = target_product.business_id
        and available_quantity > 0
      order by created_at, id
      for update
    loop
      exit when remaining_quantity = 0;
      quantity_from_lot := least(remaining_quantity, stock_lot.available_quantity);
      update public.inventory_lots
      set available_quantity = available_quantity - quantity_from_lot,
          sold_quantity = sold_quantity + quantity_from_lot
      where id = stock_lot.id;
      total_cogs_cents := total_cogs_cents + quantity_from_lot * stock_lot.unit_cost_cents;
      remaining_quantity := remaining_quantity - quantity_from_lot;
    end loop;
    if remaining_quantity > 0 then
      raise exception 'Only % units are available to sell', sale_quantity - remaining_quantity;
    end if;

    insert into public.sales (
      owner_id, business_id, inventory_unit_id, listing_id, platform, quantity,
      sale_price_cents, cogs_cents, platform_fee_cents, payment_fee_cents,
      shipping_cost_cents, other_cost_cents, sold_at
    ) values (
      target_unit.owner_id, target_unit.business_id, target_unit.id, target_listing.id,
      sale_platform, sale_quantity, sale_price_cents, total_cogs_cents,
      platform_fee_cents, payment_fee_cents, shipping_cost_cents, other_cost_cents, sale_sold_at
    ) returning id into new_sale_id;
  else
    if sale_quantity <> 1 then raise exception 'Only bulk products can sell more than one unit at a time'; end if;
    if target_unit.status = 'sold' or target_unit.is_stock_placeholder or exists (select 1 from public.sales where inventory_unit_id = target_unit.id) then raise exception 'This inventory item is already sold'; end if;
    if target_product.is_template and target_product.restock_status in ('temporarily_out', 'restock_soon', 'restock_asap') then raise exception 'Mark this repeatable product In stock before recording a sale'; end if;

    insert into public.sales (
      owner_id, business_id, inventory_unit_id, listing_id, platform, quantity,
      sale_price_cents, cogs_cents, platform_fee_cents, payment_fee_cents,
      shipping_cost_cents, other_cost_cents, sold_at
    ) values (
      target_unit.owner_id, target_unit.business_id, target_unit.id, target_listing.id,
      sale_platform, 1, sale_price_cents, target_unit.acquisition_cost_cents,
      platform_fee_cents, payment_fee_cents, shipping_cost_cents, other_cost_cents, sale_sold_at
    ) returning id into new_sale_id;
    update public.inventory_units set status = 'sold' where id = target_unit.id;

    if target_product.is_template and target_product.restock_status <> 'do_not_restock' then
      insert into public.inventory_units (owner_id, business_id, product_id, sku, status, acquisition_cost_cents, acquired_at, storage_location)
      values (target_unit.owner_id, target_unit.business_id, target_unit.product_id, 'ROS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), target_unit.status, target_unit.acquisition_cost_cents, now(), target_unit.storage_location)
      returning id into replacement_unit_id;
    elsif target_listing.id is not null then
      update public.listings set status = 'sold', ended_at = sale_sold_at where id = target_listing.id;
    end if;
  end if;

  insert into public.business_events (owner_id, business_id, event_type, entity_type, entity_id, metadata)
  values (
    target_unit.owner_id, target_unit.business_id, 'sale_recorded', 'sale', new_sale_id,
    jsonb_build_object(
      'inventory_unit_id', target_unit.id,
      'replacement_inventory_unit_id', replacement_unit_id,
      'inventory_mode', target_product.inventory_mode,
      'quantity', sale_quantity,
      'actor_id', auth.uid(),
      'sale_price_cents', sale_price_cents
    )
  );
  return new_sale_id;
end;
$$;

revoke execute on function public.record_inventory_sale(uuid, public.marketplace_platform, bigint, bigint, bigint, bigint, bigint, timestamptz, bigint) from public, anon;
grant execute on function public.record_inventory_sale(uuid, public.marketplace_platform, bigint, bigint, bigint, bigint, bigint, timestamptz, bigint) to authenticated;

grant select (quantity) on table public.sales to authenticated;

drop function public.get_owner_sales_financials(uuid);
drop function private.owner_sales_financials(uuid);

create function private.owner_sales_financials(target_owner_id uuid)
returns table (
  id uuid, inventory_unit_id uuid, listing_id uuid, platform public.marketplace_platform,
  quantity bigint, sale_price_cents bigint, cogs_cents bigint, platform_fee_cents bigint,
  payment_fee_cents bigint, shipping_cost_cents bigint, other_cost_cents bigint,
  sold_at timestamptz, created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or auth.uid() <> target_owner_id then raise exception 'Owner access required'; end if;
  return query
  select s.id, s.inventory_unit_id, s.listing_id, s.platform, s.quantity,
    s.sale_price_cents, s.cogs_cents, s.platform_fee_cents, s.payment_fee_cents,
    s.shipping_cost_cents, s.other_cost_cents, s.sold_at, s.created_at
  from public.sales s
  where s.owner_id = target_owner_id
  order by s.sold_at desc;
end;
$$;

revoke execute on function private.owner_sales_financials(uuid) from public, anon;
grant execute on function private.owner_sales_financials(uuid) to authenticated;

create function public.get_owner_sales_financials(target_owner_id uuid)
returns table (
  id uuid, inventory_unit_id uuid, listing_id uuid, platform public.marketplace_platform,
  quantity bigint, sale_price_cents bigint, cogs_cents bigint, platform_fee_cents bigint,
  payment_fee_cents bigint, shipping_cost_cents bigint, other_cost_cents bigint,
  sold_at timestamptz, created_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.owner_sales_financials(target_owner_id);
$$;

revoke execute on function public.get_owner_sales_financials(uuid) from public, anon;
grant execute on function public.get_owner_sales_financials(uuid) to authenticated;

create or replace function public.transition_inventory_item(
  target_unit_id uuid,
  target_status public.inventory_status,
  listing_external_url text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_unit public.inventory_units;
  target_product public.products;
  target_listing public.listings;
  normalized_url text := nullif(trim(listing_external_url), '');
  photo_count integer;
begin
  select * into target_unit from public.inventory_units
  where id = target_unit_id and business_id in (select private.accessible_business_ids())
  for update;
  if not found then raise exception 'Inventory item not found'; end if;
  if target_unit.status = 'sold' then raise exception 'Sold inventory cannot change status'; end if;

  select * into target_product from public.products
  where id = target_unit.product_id and business_id = target_unit.business_id;
  select * into target_listing from public.listings
  where product_id = target_unit.product_id and business_id = target_unit.business_id
  order by created_at desc limit 1 for update;
  if target_listing.id is null then raise exception 'Listing draft not found'; end if;

  if target_unit.status = 'draft' and target_status = 'ready' then
    if trim(target_product.name) = '' then raise exception 'Product name is required'; end if;
    if trim(target_listing.title) = '' then raise exception 'Listing title is required'; end if;
    if target_listing.asking_price_cents <= 0 then raise exception 'Asking price must be greater than zero'; end if;
    if target_product.inventory_mode <> 'bulk' then
      select count(*) into photo_count from public.product_photos
      where product_id = target_unit.product_id and business_id = target_unit.business_id;
      if coalesce(trim(target_listing.description), '') = '' then raise exception 'Listing description is required'; end if;
      if photo_count < 1 then raise exception 'At least one product photo is required'; end if;
    end if;
    update public.inventory_units set status = 'ready' where id = target_unit.id;
    update public.listings set status = 'ready', ended_at = null where id = target_listing.id;
  elsif target_unit.status = 'ready' and target_status = 'active' then
    if normalized_url is null or normalized_url !~* '^https?://[^[:space:]]+$' then raise exception 'Enter a valid marketplace listing URL'; end if;
    update public.inventory_units set status = 'active' where id = target_unit.id;
    update public.listings
    set status = 'active', external_url = normalized_url, posted_at = coalesce(posted_at, now()), ended_at = null
    where id = target_listing.id;
  elsif target_unit.status = 'active' and target_status = 'ready' then
    update public.inventory_units set status = 'ready' where id = target_unit.id;
    update public.listings set status = 'ready', ended_at = now() where id = target_listing.id;
  else
    raise exception 'Invalid inventory status transition from % to %', target_unit.status, target_status;
  end if;

  insert into public.business_events (owner_id, business_id, event_type, entity_type, entity_id, metadata)
  values (
    target_unit.owner_id, target_unit.business_id, 'inventory_status_changed', 'inventory_unit', target_unit.id,
    jsonb_build_object('from_status', target_unit.status, 'to_status', target_status, 'product_id', target_unit.product_id, 'listing_id', target_listing.id, 'external_url', normalized_url, 'actor_id', auth.uid())
  );
end;
$$;

revoke execute on function public.transition_inventory_item(uuid, public.inventory_status, text) from public, anon;
grant execute on function public.transition_inventory_item(uuid, public.inventory_status, text) to authenticated;

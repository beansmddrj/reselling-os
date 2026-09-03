-- A variant is a logical slice of a bulk lot (size, color, model, scent, etc.).
-- It deliberately does not create one inventory unit per physical item.
alter table public.products
  add column has_variants boolean not null default false;

alter table public.inventory_lots
  add column variant_label text;

alter table public.inventory_lots
  add constraint inventory_lots_variant_label_length
  check (variant_label is null or char_length(trim(variant_label)) between 1 and 80);

alter table public.sales
  add column variant_label text;

alter table public.sales
  add constraint sales_variant_label_length
  check (variant_label is null or char_length(trim(variant_label)) between 1 and 80);

create index inventory_lots_business_product_variant_idx
  on public.inventory_lots (business_id, product_id, variant_label)
  where available_quantity > 0;

-- Replace the bulk creator with a variant-aware version. The JSON input has a
-- deliberately small contract: [{"label":"M","quantity":15}].
drop function public.create_bulk_inventory_product(uuid, text, text, text, text, text, text, bigint, bigint, text, bigint, text, bigint, bigint, text, uuid);

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
  initial_source_shipment_id uuid default null,
  initial_variants jsonb default '[]'::jsonb
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
  variant_row jsonb;
  variant_total bigint := 0;
  variants_enabled boolean := coalesce(jsonb_array_length(initial_variants), 0) > 0;
begin
  if trim(product_name) = '' then raise exception 'Product name is required'; end if;
  if initial_quantity < 1 then raise exception 'Quantity must be at least one'; end if;
  if product_asking_price_cents < 0 or product_unit_cost_cents < 0 then raise exception 'Prices cannot be negative'; end if;
  if jsonb_typeof(initial_variants) <> 'array' then raise exception 'Variants must be a list'; end if;
  if (initial_package_quantity is null) <> (initial_units_per_package is null) then
    raise exception 'Enter both packages and units per package, or leave both blank';
  end if;
  if initial_package_quantity is not null and (initial_package_quantity < 1 or initial_units_per_package < 1) then
    raise exception 'Package counts must be at least one';
  end if;
  if initial_package_quantity is not null and initial_package_quantity * initial_units_per_package <> initial_quantity then
    raise exception 'Packages multiplied by units per package must equal total quantity';
  end if;
  if variants_enabled and initial_package_quantity is not null then
    raise exception 'Use package math or variants for now, not both on the same intake';
  end if;

  if variants_enabled then
    if exists (
      select 1 from jsonb_array_elements(initial_variants) variant
      where jsonb_typeof(variant) <> 'object'
        or nullif(trim(variant ->> 'label'), '') is null
        or (variant ->> 'quantity') !~ '^[1-9][0-9]*$'
        or char_length(trim(variant ->> 'label')) > 80
    ) then raise exception 'Every variant needs a name and a whole quantity'; end if;
    if exists (
      select 1 from jsonb_array_elements(initial_variants) variant
      group by lower(trim(variant ->> 'label'))
      having count(*) > 1
    ) then raise exception 'Each variant name must be unique'; end if;
    select coalesce(sum((variant ->> 'quantity')::bigint), 0) into variant_total
    from jsonb_array_elements(initial_variants) variant;
    if variant_total <> initial_quantity then
      raise exception 'Variant quantities add up to %, but total quantity is %', variant_total, initial_quantity;
    end if;
  end if;

  select * into target_business from public.businesses
  where id = target_business_id and id in (select private.accessible_business_ids())
  for update;
  if not found then raise exception 'Business workspace not found'; end if;
  if initial_source_shipment_id is not null and not exists (
    select 1 from public.inbound_shipments
    where id = initial_source_shipment_id and business_id = target_business.id
  ) then raise exception 'Shipment is not part of this workspace'; end if;

  insert into public.products (
    owner_id, business_id, name, brand, category, color, condition, description,
    is_template, inventory_mode, has_variants, default_asking_price_cents, default_cost_cents
  ) values (
    target_business.owner_id, target_business.id, trim(product_name), nullif(trim(product_brand), ''),
    nullif(trim(product_category), ''), nullif(trim(product_color), ''), nullif(trim(product_condition), ''),
    nullif(trim(product_description), ''), true, 'bulk', variants_enabled,
    product_asking_price_cents, product_unit_cost_cents
  ) returning id into new_product_id;

  insert into public.inventory_units (
    owner_id, business_id, product_id, sku, status, acquisition_cost_cents,
    storage_location, source_shipment_id, is_stock_placeholder
  ) values (
    target_business.owner_id, target_business.id, new_product_id,
    'ROS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    'draft', product_unit_cost_cents, nullif(trim(product_storage_location), ''),
    initial_source_shipment_id, true
  ) returning id into new_inventory_unit_id;

  if variants_enabled then
    for variant_row in select value from jsonb_array_elements(initial_variants) loop
      insert into public.inventory_lots (
        owner_id, business_id, product_id, source_shipment_id, received_quantity,
        available_quantity, variant_label, unit_cost_cents, notes
      ) values (
        target_business.owner_id, target_business.id, new_product_id, initial_source_shipment_id,
        (variant_row ->> 'quantity')::bigint, (variant_row ->> 'quantity')::bigint,
        trim(variant_row ->> 'label'), product_unit_cost_cents, nullif(trim(initial_notes), '')
      ) returning id into new_lot_id;
    end loop;
  else
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
  end if;

  insert into public.listings (
    owner_id, business_id, product_id, platform, status, title, description, asking_price_cents
  ) values (
    target_business.owner_id, target_business.id, new_product_id, 'facebook', 'draft',
    trim(product_name), nullif(trim(product_description), ''), product_asking_price_cents
  ) returning id into new_listing_id;

  insert into public.business_events (owner_id, business_id, event_type, entity_type, entity_id, metadata)
  values (
    target_business.owner_id, target_business.id, 'bulk_inventory_created', 'inventory_lot', new_lot_id,
    jsonb_build_object('product_id', new_product_id, 'inventory_unit_id', new_inventory_unit_id,
      'listing_id', new_listing_id, 'quantity', initial_quantity, 'has_variants', variants_enabled,
      'actor_id', auth.uid())
  );
  return query select new_product_id, new_inventory_unit_id, new_lot_id, new_listing_id;
end;
$$;

revoke execute on function public.create_bulk_inventory_product(uuid, text, text, text, text, text, text, bigint, bigint, text, bigint, text, bigint, bigint, text, uuid, jsonb) from public, anon;
grant execute on function public.create_bulk_inventory_product(uuid, text, text, text, text, text, text, bigint, bigint, text, bigint, text, bigint, bigint, text, uuid, jsonb) to authenticated;

-- A bulk sale can only draw stock from its chosen variant. This keeps the
-- inventory balance atomic and blocks both wrong-variant sales and overselling.
drop function public.record_inventory_sale(uuid, public.marketplace_platform, bigint, bigint, bigint, bigint, bigint, timestamptz, bigint);

create function public.record_inventory_sale(
  target_unit_id uuid,
  sale_platform public.marketplace_platform,
  sale_price_cents bigint,
  platform_fee_cents bigint,
  payment_fee_cents bigint,
  shipping_cost_cents bigint,
  other_cost_cents bigint,
  sale_sold_at timestamptz,
  sale_quantity bigint default 1,
  sale_variant_label text default null
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
  normalized_variant_label text := nullif(trim(sale_variant_label), '');
begin
  if sale_price_cents <= 0 then raise exception 'Sale price must be greater than zero'; end if;
  if sale_quantity < 1 then raise exception 'Sale quantity must be at least one'; end if;
  if platform_fee_cents < 0 or payment_fee_cents < 0 or shipping_cost_cents < 0 or other_cost_cents < 0 then raise exception 'Sale costs cannot be negative'; end if;
  if sale_sold_at is null or sale_sold_at > now() + interval '5 minutes' then raise exception 'Sold date is invalid'; end if;
  if normalized_variant_label is not null and char_length(normalized_variant_label) > 80 then raise exception 'Variant name is invalid'; end if;

  select * into target_unit from public.inventory_units
  where id = target_unit_id and business_id in (select private.accessible_business_ids()) for update;
  if not found then raise exception 'Inventory item not found'; end if;
  select * into target_product from public.products
  where id = target_unit.product_id and business_id = target_unit.business_id for update;
  if not found then raise exception 'Product not found'; end if;
  select * into target_listing from public.listings
  where product_id = target_product.id and business_id = target_product.business_id
  order by created_at desc limit 1 for update;

  if target_product.inventory_mode = 'bulk' then
    if target_product.has_variants and normalized_variant_label is null then raise exception 'Choose a variant before recording this sale'; end if;
    if not target_product.has_variants and normalized_variant_label is not null then raise exception 'This bulk product does not use variants'; end if;
    remaining_quantity := sale_quantity;
    for stock_lot in
      select * from public.inventory_lots
      where product_id = target_product.id and business_id = target_product.business_id
        and available_quantity > 0
        and ((target_product.has_variants and lower(variant_label) = lower(normalized_variant_label))
          or (not target_product.has_variants and variant_label is null))
      order by created_at, id for update
    loop
      exit when remaining_quantity = 0;
      quantity_from_lot := least(remaining_quantity, stock_lot.available_quantity);
      update public.inventory_lots set available_quantity = available_quantity - quantity_from_lot,
        sold_quantity = sold_quantity + quantity_from_lot where id = stock_lot.id;
      total_cogs_cents := total_cogs_cents + quantity_from_lot * stock_lot.unit_cost_cents;
      remaining_quantity := remaining_quantity - quantity_from_lot;
    end loop;
    if remaining_quantity > 0 then
      raise exception 'Only % units are available for this variant', sale_quantity - remaining_quantity;
    end if;
    insert into public.sales (
      owner_id, business_id, inventory_unit_id, listing_id, platform, quantity, variant_label,
      sale_price_cents, cogs_cents, platform_fee_cents, payment_fee_cents, shipping_cost_cents,
      other_cost_cents, sold_at
    ) values (
      target_unit.owner_id, target_unit.business_id, target_unit.id, target_listing.id, sale_platform,
      sale_quantity, normalized_variant_label, sale_price_cents, total_cogs_cents, platform_fee_cents,
      payment_fee_cents, shipping_cost_cents, other_cost_cents, sale_sold_at
    ) returning id into new_sale_id;
  else
    if sale_quantity <> 1 then raise exception 'Only bulk products can sell more than one unit at a time'; end if;
    if normalized_variant_label is not null then raise exception 'Variants are only available for bulk products'; end if;
    if target_unit.status = 'sold' or target_unit.is_stock_placeholder or exists (select 1 from public.sales where inventory_unit_id = target_unit.id) then raise exception 'This inventory item is already sold'; end if;
    if target_product.is_template and target_product.restock_status in ('temporarily_out', 'restock_soon', 'restock_asap') then raise exception 'Mark this repeatable product In stock before recording a sale'; end if;
    insert into public.sales (
      owner_id, business_id, inventory_unit_id, listing_id, platform, quantity, sale_price_cents,
      cogs_cents, platform_fee_cents, payment_fee_cents, shipping_cost_cents, other_cost_cents, sold_at
    ) values (
      target_unit.owner_id, target_unit.business_id, target_unit.id, target_listing.id, sale_platform, 1,
      sale_price_cents, target_unit.acquisition_cost_cents, platform_fee_cents, payment_fee_cents,
      shipping_cost_cents, other_cost_cents, sale_sold_at
    ) returning id into new_sale_id;
    update public.inventory_units set status = 'sold' where id = target_unit.id;
    if target_product.is_template and target_product.restock_status <> 'do_not_restock' then
      insert into public.inventory_units (owner_id, business_id, product_id, sku, status, acquisition_cost_cents, acquired_at, storage_location)
      values (target_unit.owner_id, target_unit.business_id, target_unit.product_id,
        'ROS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), target_unit.status,
        target_unit.acquisition_cost_cents, now(), target_unit.storage_location)
      returning id into replacement_unit_id;
    elsif target_listing.id is not null then
      update public.listings set status = 'sold', ended_at = sale_sold_at where id = target_listing.id;
    end if;
  end if;
  insert into public.business_events (owner_id, business_id, event_type, entity_type, entity_id, metadata)
  values (target_unit.owner_id, target_unit.business_id, 'sale_recorded', 'sale', new_sale_id,
    jsonb_build_object('inventory_unit_id', target_unit.id, 'replacement_inventory_unit_id', replacement_unit_id,
      'inventory_mode', target_product.inventory_mode, 'quantity', sale_quantity,
      'variant_label', normalized_variant_label, 'actor_id', auth.uid(), 'sale_price_cents', sale_price_cents));
  return new_sale_id;
end;
$$;

revoke execute on function public.record_inventory_sale(uuid, public.marketplace_platform, bigint, bigint, bigint, bigint, bigint, timestamptz, bigint, text) from public, anon;
grant execute on function public.record_inventory_sale(uuid, public.marketplace_platform, bigint, bigint, bigint, bigint, bigint, timestamptz, bigint, text) to authenticated;
grant select (variant_label) on table public.sales to authenticated;

drop function public.adjust_bulk_inventory_quantity(uuid, bigint);

create function public.adjust_bulk_inventory_quantity(
  target_unit_id uuid,
  quantity_delta bigint,
  target_variant_label text default null
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_unit public.inventory_units;
  target_product public.products;
  stock_lot public.inventory_lots;
  remaining_quantity bigint;
  quantity_from_lot bigint;
  available_total bigint;
  normalized_variant_label text := nullif(trim(target_variant_label), '');
begin
  if quantity_delta = 0 then raise exception 'Quantity must change'; end if;
  if abs(quantity_delta) > 1000000 then raise exception 'Quantity adjustment is too large'; end if;
  select * into target_unit from public.inventory_units
  where id = target_unit_id and business_id in (select private.accessible_business_ids()) for update;
  if not found then raise exception 'Inventory item not found'; end if;
  select * into target_product from public.products
  where id = target_unit.product_id and business_id = target_unit.business_id for update;
  if not found or target_product.inventory_mode <> 'bulk' then raise exception 'Quantity adjustments are only available for bulk products'; end if;
  if target_product.has_variants and normalized_variant_label is null then raise exception 'Choose the variant you are adjusting'; end if;
  if not target_product.has_variants and normalized_variant_label is not null then raise exception 'This bulk product does not use variants'; end if;

  if quantity_delta > 0 then
    insert into public.inventory_lots (owner_id, business_id, product_id, source_shipment_id, received_quantity, available_quantity, variant_label, unit_cost_cents, notes)
    values (target_unit.owner_id, target_unit.business_id, target_product.id, target_unit.source_shipment_id,
      quantity_delta, quantity_delta, normalized_variant_label, target_unit.acquisition_cost_cents, 'Manual stock adjustment');
  else
    remaining_quantity := abs(quantity_delta);
    for stock_lot in
      select * from public.inventory_lots
      where product_id = target_product.id and business_id = target_product.business_id and available_quantity > 0
        and ((target_product.has_variants and lower(variant_label) = lower(normalized_variant_label))
          or (not target_product.has_variants and variant_label is null))
      order by created_at desc, id desc for update
    loop
      exit when remaining_quantity = 0;
      quantity_from_lot := least(remaining_quantity, stock_lot.available_quantity);
      update public.inventory_lots set available_quantity = available_quantity - quantity_from_lot,
        missing_quantity = missing_quantity + quantity_from_lot where id = stock_lot.id;
      remaining_quantity := remaining_quantity - quantity_from_lot;
    end loop;
    if remaining_quantity > 0 then raise exception 'Only % units are available for this variant', abs(quantity_delta) - remaining_quantity; end if;
  end if;
  select coalesce(sum(available_quantity), 0) into available_total from public.inventory_lots
  where product_id = target_product.id and business_id = target_product.business_id;
  insert into public.business_events (owner_id, business_id, event_type, entity_type, entity_id, metadata)
  values (target_unit.owner_id, target_unit.business_id, 'bulk_inventory_quantity_adjusted', 'product', target_product.id,
    jsonb_build_object('inventory_unit_id', target_unit.id, 'quantity_delta', quantity_delta,
      'variant_label', normalized_variant_label, 'available_quantity', available_total, 'actor_id', auth.uid()));
  return available_total;
end;
$$;

revoke execute on function public.adjust_bulk_inventory_quantity(uuid, bigint, text) from public, anon;
grant execute on function public.adjust_bulk_inventory_quantity(uuid, bigint, text) to authenticated;

-- Owners keep their private financial ledger, with a safe operational variant
-- label included for bulk sales.
drop function public.get_owner_sales_financials(uuid);
drop function private.owner_sales_financials(uuid);

create function private.owner_sales_financials(target_owner_id uuid)
returns table (
  id uuid, inventory_unit_id uuid, listing_id uuid, platform public.marketplace_platform,
  quantity bigint, variant_label text, sale_price_cents bigint, cogs_cents bigint,
  platform_fee_cents bigint, payment_fee_cents bigint, shipping_cost_cents bigint,
  other_cost_cents bigint, sold_at timestamptz, created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or auth.uid() <> target_owner_id then raise exception 'Owner access required'; end if;
  return query
  select s.id, s.inventory_unit_id, s.listing_id, s.platform, s.quantity, s.variant_label,
    s.sale_price_cents, s.cogs_cents, s.platform_fee_cents, s.payment_fee_cents,
    s.shipping_cost_cents, s.other_cost_cents, s.sold_at, s.created_at
  from public.sales s where s.owner_id = target_owner_id order by s.sold_at desc;
end;
$$;

revoke execute on function private.owner_sales_financials(uuid) from public, anon;
grant execute on function private.owner_sales_financials(uuid) to authenticated;

create function public.get_owner_sales_financials(target_owner_id uuid)
returns table (
  id uuid, inventory_unit_id uuid, listing_id uuid, platform public.marketplace_platform,
  quantity bigint, variant_label text, sale_price_cents bigint, cogs_cents bigint,
  platform_fee_cents bigint, payment_fee_cents bigint, shipping_cost_cents bigint,
  other_cost_cents bigint, sold_at timestamptz, created_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$ select * from private.owner_sales_financials(target_owner_id); $$;

revoke execute on function public.get_owner_sales_financials(uuid) from public, anon;
grant execute on function public.get_owner_sales_financials(uuid) to authenticated;

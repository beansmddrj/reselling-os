-- A repeatable product shares product/listing copy, but every physical unit can
-- carry its own optional size. Existing units are intentionally N/A (NULL).
alter table public.inventory_units add column variant_size text;

drop function public.adjust_repeatable_inventory_quantity(uuid, smallint);

create function public.adjust_repeatable_inventory_quantity(
  target_unit_id uuid,
  quantity_delta smallint,
  new_unit_size text default null
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_unit public.inventory_units;
  source_unit public.inventory_units;
  target_product public.products;
  target_listing public.listings;
  available_count integer;
  next_status public.inventory_status;
  normalized_size text;
begin
  if quantity_delta not in (-1, 1) then
    raise exception 'Quantity can only change by one at a time';
  end if;

  normalized_size := nullif(btrim(new_unit_size), '');
  if normalized_size is not null and char_length(normalized_size) > 80 then
    raise exception 'Size must be 80 characters or fewer';
  end if;

  select * into target_unit
  from public.inventory_units
  where id = target_unit_id
    and owner_id in (select private.accessible_business_owner_ids())
  for update;
  if not found then
    raise exception 'Inventory item not found';
  end if;

  select * into target_product
  from public.products
  where id = target_unit.product_id and owner_id = target_unit.owner_id
  for update;
  if not found or not target_product.is_template then
    raise exception 'Quantity can only be changed for Sell Multiple listings';
  end if;

  select count(*) into available_count
  from public.inventory_units
  where product_id = target_unit.product_id
    and owner_id = target_unit.owner_id
    and status <> 'sold';

  if quantity_delta = -1 then
    if available_count < 1 then
      raise exception 'There are no available units to remove';
    end if;

    select * into source_unit
    from public.inventory_units
    where product_id = target_unit.product_id
      and owner_id = target_unit.owner_id
      and status <> 'sold'
    order by created_at desc
    limit 1
    for update;

    delete from public.inventory_units where id = source_unit.id;
    available_count := available_count - 1;
  else
    select * into source_unit
    from public.inventory_units
    where product_id = target_unit.product_id
      and owner_id = target_unit.owner_id
      and status <> 'sold'
    order by created_at desc
    limit 1
    for update;

    select * into target_listing
    from public.listings
    where product_id = target_unit.product_id and owner_id = target_unit.owner_id
    order by created_at desc
    limit 1;

    next_status := case
      when source_unit.id is not null then source_unit.status
      when target_listing.external_url is not null then 'active'::public.inventory_status
      else 'ready'::public.inventory_status
    end;

    insert into public.inventory_units (
      owner_id, product_id, sku, status, acquisition_cost_cents,
      acquired_at, storage_location, source_shipment_id, variant_size
    )
    values (
      target_unit.owner_id,
      target_unit.product_id,
      'ROS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
      next_status,
      coalesce(source_unit.acquisition_cost_cents, target_unit.acquisition_cost_cents),
      now(),
      coalesce(source_unit.storage_location, target_unit.storage_location),
      coalesce(source_unit.source_shipment_id, target_unit.source_shipment_id),
      normalized_size
    );
    available_count := available_count + 1;
  end if;

  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata)
  values (
    target_unit.owner_id,
    'repeatable_quantity_adjusted',
    'product',
    target_product.id,
    jsonb_build_object(
      'inventory_unit_id', target_unit_id,
      'quantity_delta', quantity_delta,
      'new_unit_size', normalized_size,
      'available_count', available_count,
      'actor_id', auth.uid()
    )
  );

  return available_count;
end;
$$;

revoke execute on function public.adjust_repeatable_inventory_quantity(uuid, smallint, text) from public, anon;
grant execute on function public.adjust_repeatable_inventory_quantity(uuid, smallint, text) to authenticated;

-- A sale consumes one real unit. The product/listing remains reusable, while
-- restock is explicitly managed through the quantity controls.
create or replace function public.record_inventory_sale(
  target_unit_id uuid,
  sale_platform public.marketplace_platform,
  sale_price_cents bigint,
  platform_fee_cents bigint,
  payment_fee_cents bigint,
  shipping_cost_cents bigint,
  other_cost_cents bigint,
  sale_sold_at timestamptz
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
  new_sale_id uuid;
begin
  if sale_price_cents <= 0 then raise exception 'Sale price must be greater than zero'; end if;
  if platform_fee_cents < 0 or payment_fee_cents < 0 or shipping_cost_cents < 0 or other_cost_cents < 0 then raise exception 'Sale costs cannot be negative'; end if;
  if sale_sold_at is null or sale_sold_at > now() + interval '5 minutes' then raise exception 'Sold date is invalid'; end if;

  select * into target_unit
  from public.inventory_units
  where id = target_unit_id and owner_id in (select private.accessible_business_owner_ids())
  for update;
  if not found then raise exception 'Inventory item not found'; end if;
  if target_unit.status = 'sold' or exists (select 1 from public.sales where inventory_unit_id = target_unit.id) then raise exception 'This inventory item is already sold'; end if;

  select * into target_product
  from public.products
  where id = target_unit.product_id and owner_id = target_unit.owner_id;
  if target_product.is_template and target_product.restock_status in ('temporarily_out', 'restock_soon', 'restock_asap') then
    raise exception 'Mark this repeatable product In stock before recording a sale';
  end if;

  select * into target_listing
  from public.listings
  where product_id = target_unit.product_id and owner_id = target_unit.owner_id
  order by created_at desc
  limit 1
  for update;

  insert into public.sales (
    owner_id, inventory_unit_id, listing_id, platform, sale_price_cents,
    cogs_cents, platform_fee_cents, payment_fee_cents, shipping_cost_cents,
    other_cost_cents, sold_at
  )
  values (
    target_unit.owner_id, target_unit.id, target_listing.id, sale_platform,
    sale_price_cents, target_unit.acquisition_cost_cents, platform_fee_cents,
    payment_fee_cents, shipping_cost_cents, other_cost_cents, sale_sold_at
  )
  returning id into new_sale_id;

  update public.inventory_units set status = 'sold' where id = target_unit.id;

  if not target_product.is_template and target_listing.id is not null then
    update public.listings set status = 'sold', ended_at = sale_sold_at where id = target_listing.id;
  end if;

  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata)
  values (
    target_unit.owner_id,
    'sale_recorded',
    'sale',
    new_sale_id,
    jsonb_build_object(
      'inventory_unit_id', target_unit.id,
      'sell_multiple', target_product.is_template,
      'actor_id', auth.uid(),
      'sale_price_cents', sale_price_cents
    )
  );

  return new_sale_id;
end;
$$;

drop function if exists public.update_inventory_item(uuid, text, text, text, text, text, text, text, bigint, text, text, text, bigint);

create function public.update_inventory_item(
  target_unit_id uuid, product_name text, product_brand text, product_category text,
  product_size text, product_color text, product_condition text, product_description text,
  product_sell_multiple boolean, unit_cost_cents bigint, unit_storage_location text,
  listing_title text, listing_description text, listing_asking_price_cents bigint
)
returns void
language plpgsql
set search_path = ''
as $$
declare target_unit public.inventory_units; target_listing_id uuid;
begin
  if trim(product_name) = '' then raise exception 'Product name is required'; end if;
  if trim(listing_title) = '' then raise exception 'Listing title is required'; end if;
  if unit_cost_cents < 0 or listing_asking_price_cents < 0 then raise exception 'Prices cannot be negative'; end if;
  select * into target_unit from public.inventory_units
  where id = target_unit_id and owner_id in (select private.accessible_business_owner_ids()) for update;
  if not found then raise exception 'Inventory item not found'; end if;
  update public.products set name = trim(product_name), brand = nullif(trim(product_brand), ''), category = nullif(trim(product_category), ''), size = nullif(trim(product_size), ''), color = nullif(trim(product_color), ''), condition = nullif(trim(product_condition), ''), description = nullif(trim(product_description), ''), is_template = product_sell_multiple, default_cost_cents = unit_cost_cents, default_asking_price_cents = listing_asking_price_cents
  where id = target_unit.product_id and owner_id = target_unit.owner_id;
  update public.inventory_units set acquisition_cost_cents = unit_cost_cents, storage_location = nullif(trim(unit_storage_location), '')
  where id = target_unit.id and owner_id = target_unit.owner_id;
  select id into target_listing_id from public.listings where product_id = target_unit.product_id and owner_id = target_unit.owner_id order by created_at desc limit 1 for update;
  if target_listing_id is null then raise exception 'Listing draft not found'; end if;
  update public.listings set title = trim(listing_title), description = nullif(trim(listing_description), ''), asking_price_cents = listing_asking_price_cents
  where id = target_listing_id and owner_id = target_unit.owner_id;
  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata)
  values (target_unit.owner_id, 'inventory_item_edited', 'inventory_unit', target_unit.id,
    jsonb_build_object('product_id', target_unit.product_id, 'listing_id', target_listing_id, 'sell_multiple', product_sell_multiple, 'actor_id', auth.uid()));
end;
$$;

revoke execute on function public.update_inventory_item(uuid, text, text, text, text, text, text, text, boolean, bigint, text, text, text, bigint) from public, anon;
grant execute on function public.update_inventory_item(uuid, text, text, text, text, text, text, text, boolean, bigint, text, text, text, bigint) to authenticated;

create or replace function public.record_inventory_sale(
  target_unit_id uuid, sale_platform public.marketplace_platform, sale_price_cents bigint,
  platform_fee_cents bigint, payment_fee_cents bigint, shipping_cost_cents bigint,
  other_cost_cents bigint, sale_sold_at timestamptz
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  target_unit public.inventory_units;
  target_product public.products;
  target_listing public.listings;
  new_sale_id uuid;
  replacement_unit_id uuid;
begin
  if sale_price_cents <= 0 then raise exception 'Sale price must be greater than zero'; end if;
  if platform_fee_cents < 0 or payment_fee_cents < 0 or shipping_cost_cents < 0 or other_cost_cents < 0 then raise exception 'Sale costs cannot be negative'; end if;
  if sale_sold_at is null or sale_sold_at > now() + interval '5 minutes' then raise exception 'Sold date is invalid'; end if;

  select * into target_unit from public.inventory_units
  where id = target_unit_id and owner_id in (select private.accessible_business_owner_ids()) for update;
  if not found then raise exception 'Inventory item not found'; end if;
  if target_unit.status = 'sold' or exists (select 1 from public.sales where inventory_unit_id = target_unit.id) then raise exception 'This inventory item is already sold'; end if;
  select * into target_product from public.products where id = target_unit.product_id and owner_id = target_unit.owner_id;
  select * into target_listing from public.listings where product_id = target_unit.product_id and owner_id = target_unit.owner_id order by created_at desc limit 1 for update;

  insert into public.sales (owner_id, inventory_unit_id, listing_id, platform, sale_price_cents, cogs_cents, platform_fee_cents, payment_fee_cents, shipping_cost_cents, other_cost_cents, sold_at)
  values (target_unit.owner_id, target_unit.id, target_listing.id, sale_platform, sale_price_cents, target_unit.acquisition_cost_cents, platform_fee_cents, payment_fee_cents, shipping_cost_cents, other_cost_cents, sale_sold_at)
  returning id into new_sale_id;
  update public.inventory_units set status = 'sold' where id = target_unit.id;

  if target_product.is_template then
    insert into public.inventory_units (owner_id, product_id, sku, status, acquisition_cost_cents, acquired_at, storage_location)
    values (target_unit.owner_id, target_unit.product_id, 'ROS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), target_unit.status, target_unit.acquisition_cost_cents, now(), target_unit.storage_location)
    returning id into replacement_unit_id;
  elsif target_listing.id is not null then
    update public.listings set status = 'sold', ended_at = sale_sold_at where id = target_listing.id;
  end if;

  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata)
  values (target_unit.owner_id, 'sale_recorded', 'sale', new_sale_id,
    jsonb_build_object('inventory_unit_id', target_unit.id, 'replacement_inventory_unit_id', replacement_unit_id, 'sell_multiple', target_product.is_template, 'actor_id', auth.uid(), 'sale_price_cents', sale_price_cents));
  return new_sale_id;
end;
$$;

revoke execute on function public.record_inventory_sale(uuid, public.marketplace_platform, bigint, bigint, bigint, bigint, bigint, timestamptz) from public, anon;
grant execute on function public.record_inventory_sale(uuid, public.marketplace_platform, bigint, bigint, bigint, bigint, bigint, timestamptz) to authenticated;

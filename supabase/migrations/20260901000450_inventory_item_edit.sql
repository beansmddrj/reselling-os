create or replace function public.update_inventory_item(
  target_unit_id uuid,
  product_name text,
  product_brand text,
  product_category text,
  product_size text,
  product_color text,
  product_condition text,
  product_description text,
  unit_cost_cents bigint,
  unit_storage_location text,
  listing_title text,
  listing_description text,
  listing_asking_price_cents bigint
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  target_unit public.inventory_units;
  target_listing_id uuid;
begin
  if trim(product_name) = '' then raise exception 'Product name is required'; end if;
  if trim(listing_title) = '' then raise exception 'Listing title is required'; end if;
  if unit_cost_cents < 0 or listing_asking_price_cents < 0 then raise exception 'Prices cannot be negative'; end if;

  select * into target_unit
  from public.inventory_units
  where id = target_unit_id and owner_id = auth.uid()
  for update;

  if not found then raise exception 'Inventory item not found'; end if;

  update public.products set
    name = trim(product_name),
    brand = nullif(trim(product_brand), ''),
    category = nullif(trim(product_category), ''),
    size = nullif(trim(product_size), ''),
    color = nullif(trim(product_color), ''),
    condition = nullif(trim(product_condition), ''),
    description = nullif(trim(product_description), ''),
    default_cost_cents = unit_cost_cents,
    default_asking_price_cents = listing_asking_price_cents
  where id = target_unit.product_id and owner_id = auth.uid();

  update public.inventory_units set
    acquisition_cost_cents = unit_cost_cents,
    storage_location = nullif(trim(unit_storage_location), '')
  where id = target_unit.id and owner_id = auth.uid();

  select id into target_listing_id
  from public.listings
  where product_id = target_unit.product_id and owner_id = auth.uid()
  order by created_at desc
  limit 1
  for update;

  if target_listing_id is null then raise exception 'Listing draft not found'; end if;

  update public.listings set
    title = trim(listing_title),
    description = nullif(trim(listing_description), ''),
    asking_price_cents = listing_asking_price_cents
  where id = target_listing_id and owner_id = auth.uid();

  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata)
  values (auth.uid(), 'inventory_item_edited', 'inventory_unit', target_unit.id,
    jsonb_build_object('product_id', target_unit.product_id, 'listing_id', target_listing_id));
end;
$$;

revoke execute on function public.update_inventory_item(uuid, text, text, text, text, text, text, text, bigint, text, text, text, bigint) from public, anon;
grant execute on function public.update_inventory_item(uuid, text, text, text, text, text, text, text, bigint, text, text, text, bigint) to authenticated;

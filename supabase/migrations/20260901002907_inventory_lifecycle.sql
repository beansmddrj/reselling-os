create or replace function public.transition_inventory_item(
  target_unit_id uuid,
  target_status public.inventory_status,
  listing_external_url text default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  target_unit public.inventory_units;
  target_product public.products;
  target_listing public.listings;
  normalized_url text := nullif(trim(listing_external_url), '');
  photo_count integer;
begin
  select * into target_unit
  from public.inventory_units
  where id = target_unit_id and owner_id = auth.uid()
  for update;

  if not found then raise exception 'Inventory item not found'; end if;
  if target_unit.status = 'sold' then raise exception 'Sold inventory cannot change status'; end if;

  select * into target_product
  from public.products
  where id = target_unit.product_id and owner_id = auth.uid();

  select * into target_listing
  from public.listings
  where product_id = target_unit.product_id and owner_id = auth.uid()
  order by created_at desc
  limit 1
  for update;

  if target_listing.id is null then raise exception 'Listing draft not found'; end if;

  if target_unit.status = 'draft' and target_status = 'ready' then
    select count(*) into photo_count
    from public.product_photos
    where product_id = target_unit.product_id and owner_id = auth.uid();

    if trim(target_product.name) = '' then raise exception 'Product name is required'; end if;
    if trim(target_listing.title) = '' then raise exception 'Listing title is required'; end if;
    if coalesce(trim(target_listing.description), '') = '' then raise exception 'Listing description is required'; end if;
    if target_listing.asking_price_cents <= 0 then raise exception 'Asking price must be greater than zero'; end if;
    if photo_count < 1 then raise exception 'At least one product photo is required'; end if;

    update public.inventory_units set status = 'ready' where id = target_unit.id;
    update public.listings set status = 'ready', ended_at = null where id = target_listing.id;
  elsif target_unit.status = 'ready' and target_status = 'active' then
    if normalized_url is null or normalized_url !~* '^https?://[^[:space:]]+$' then
      raise exception 'Enter a valid marketplace listing URL';
    end if;

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

  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'inventory_status_changed', 'inventory_unit', target_unit.id,
    jsonb_build_object(
      'from_status', target_unit.status,
      'to_status', target_status,
      'product_id', target_unit.product_id,
      'listing_id', target_listing.id,
      'external_url', normalized_url
    )
  );
end;
$$;

revoke execute on function public.transition_inventory_item(uuid, public.inventory_status, text) from public, anon;
grant execute on function public.transition_inventory_item(uuid, public.inventory_status, text) to authenticated;

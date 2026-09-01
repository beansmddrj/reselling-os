-- One Sold Moment per sale keeps the ledger compact while preserving a
-- straightforward social-content archive.
create unique index sale_moments_one_per_sale_idx on public.sale_moments(sale_id);

create or replace function public.adjust_repeatable_inventory_quantity(
  target_unit_id uuid,
  quantity_delta smallint
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
begin
  if quantity_delta not in (-1, 1) then raise exception 'Quantity can only change by one at a time'; end if;
  select * into target_unit from public.inventory_units
  where id = target_unit_id and owner_id in (select private.accessible_business_owner_ids())
  for update;
  if not found then raise exception 'Inventory item not found'; end if;
  select * into target_product from public.products
  where id = target_unit.product_id and owner_id = target_unit.owner_id for update;
  if not found or not target_product.is_template then raise exception 'Quantity can only be changed for Sell Multiple listings'; end if;
  select count(*) into available_count from public.inventory_units
  where product_id = target_unit.product_id and owner_id = target_unit.owner_id and status <> 'sold';

  if quantity_delta = -1 then
    if available_count < 1 then raise exception 'There are no available units to remove'; end if;
    select * into source_unit from public.inventory_units
    where product_id = target_unit.product_id and owner_id = target_unit.owner_id and status <> 'sold'
    order by created_at desc limit 1 for update;
    delete from public.inventory_units where id = source_unit.id;
    available_count := available_count - 1;
  else
    select * into source_unit from public.inventory_units
    where product_id = target_unit.product_id and owner_id = target_unit.owner_id and status <> 'sold'
    order by created_at desc limit 1 for update;
    select * into target_listing from public.listings
    where product_id = target_unit.product_id and owner_id = target_unit.owner_id
    order by created_at desc limit 1;
    next_status := case when source_unit.id is not null then source_unit.status when target_listing.external_url is not null then 'active'::public.inventory_status else 'ready'::public.inventory_status end;
    insert into public.inventory_units (owner_id, product_id, sku, status, acquisition_cost_cents, acquired_at, storage_location, source_shipment_id)
    values (target_unit.owner_id, target_unit.product_id, 'ROS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), next_status, coalesce(source_unit.acquisition_cost_cents, target_unit.acquisition_cost_cents), now(), coalesce(source_unit.storage_location, target_unit.storage_location), coalesce(source_unit.source_shipment_id, target_unit.source_shipment_id));
    available_count := available_count + 1;
  end if;

  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata)
  values (target_unit.owner_id, 'repeatable_quantity_adjusted', 'product', target_product.id,
    jsonb_build_object('inventory_unit_id', target_unit_id, 'quantity_delta', quantity_delta, 'available_count', available_count, 'actor_id', auth.uid()));
  return available_count;
end;
$$;

revoke execute on function public.adjust_repeatable_inventory_quantity(uuid, smallint) from public, anon;
grant execute on function public.adjust_repeatable_inventory_quantity(uuid, smallint) to authenticated;

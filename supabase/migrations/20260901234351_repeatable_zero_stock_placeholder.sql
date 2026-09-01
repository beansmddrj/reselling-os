-- Preserve one lightweight anchor when a repeatable listing reaches zero so
-- its detail page remains the place to restock it.
alter table public.inventory_units
  add column is_stock_placeholder boolean not null default false;

drop function public.adjust_repeatable_inventory_quantity(uuid, smallint, text);

create function public.adjust_repeatable_inventory_quantity(
  target_unit_id uuid,
  quantity_delta smallint,
  new_unit_size text default null,
  target_variant_size text default null
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
  if quantity_delta not in (-1, 1) then raise exception 'Quantity can only change by one at a time'; end if;
  normalized_size := nullif(btrim(new_unit_size), '');
  if normalized_size is not null and char_length(normalized_size) > 80 then raise exception 'Size must be 80 characters or fewer'; end if;

  select * into target_unit from public.inventory_units
  where id = target_unit_id and owner_id in (select private.accessible_business_owner_ids())
  for update;
  if not found then raise exception 'Inventory item not found'; end if;
  select * into target_product from public.products
  where id = target_unit.product_id and owner_id = target_unit.owner_id for update;
  if not found or not target_product.is_template then raise exception 'Quantity can only be changed for Sell Multiple listings'; end if;

  select count(*) into available_count from public.inventory_units
  where product_id = target_unit.product_id
    and owner_id = target_unit.owner_id
    and status <> 'sold'
    and not is_stock_placeholder;

  if quantity_delta = -1 then
    if available_count < 1 then raise exception 'There are no available units to remove'; end if;
    select * into source_unit from public.inventory_units
    where product_id = target_unit.product_id
      and owner_id = target_unit.owner_id
      and status <> 'sold'
      and not is_stock_placeholder
      and (target_variant_size is null or coalesce(variant_size, '') = target_variant_size)
    order by created_at desc limit 1 for update;
    if not found then raise exception 'There is no available unit in that size'; end if;

    if available_count = 1 then
      update public.inventory_units
      set is_stock_placeholder = true, variant_size = null
      where id = source_unit.id;
    else
      delete from public.inventory_units where id = source_unit.id;
    end if;
    available_count := available_count - 1;
  else
    select * into source_unit from public.inventory_units
    where product_id = target_unit.product_id
      and owner_id = target_unit.owner_id
      and status <> 'sold'
      and not is_stock_placeholder
    order by created_at desc limit 1 for update;
    select * into target_listing from public.listings
    where product_id = target_unit.product_id and owner_id = target_unit.owner_id
    order by created_at desc limit 1;
    next_status := case
      when source_unit.id is not null then source_unit.status
      when target_listing.external_url is not null then 'active'::public.inventory_status
      else 'ready'::public.inventory_status
    end;
    insert into public.inventory_units (
      owner_id, product_id, sku, status, acquisition_cost_cents,
      acquired_at, storage_location, source_shipment_id, variant_size
    ) values (
      target_unit.owner_id, target_unit.product_id,
      'ROS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
      next_status, coalesce(source_unit.acquisition_cost_cents, target_unit.acquisition_cost_cents),
      now(), coalesce(source_unit.storage_location, target_unit.storage_location),
      coalesce(source_unit.source_shipment_id, target_unit.source_shipment_id), normalized_size
    );
    available_count := available_count + 1;
  end if;

  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata)
  values (target_unit.owner_id, 'repeatable_quantity_adjusted', 'product', target_product.id,
    jsonb_build_object('inventory_unit_id', target_unit_id, 'quantity_delta', quantity_delta, 'size', normalized_size, 'available_count', available_count, 'actor_id', auth.uid()));
  return available_count;
end;
$$;

revoke execute on function public.adjust_repeatable_inventory_quantity(uuid, smallint, text, text) from public, anon;
grant execute on function public.adjust_repeatable_inventory_quantity(uuid, smallint, text, text) to authenticated;

create function private.prevent_stock_placeholder_sale()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.inventory_units
    where id = new.inventory_unit_id and is_stock_placeholder
  ) then
    raise exception 'Restock this repeatable listing before recording a sale';
  end if;
  return new;
end;
$$;

drop trigger if exists sales_prevent_stock_placeholder on public.sales;
create trigger sales_prevent_stock_placeholder
before insert on public.sales
for each row execute function private.prevent_stock_placeholder_sale();

create or replace function public.set_repeatable_inventory_unit_size(
  target_unit_id uuid,
  new_unit_size text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare target_unit public.inventory_units; normalized_size text;
begin
  normalized_size := nullif(btrim(new_unit_size), '');
  if normalized_size is null then raise exception 'Enter a size for this unit'; end if;
  if char_length(normalized_size) > 80 then raise exception 'Size must be 80 characters or fewer'; end if;
  select * into target_unit from public.inventory_units
  where id = target_unit_id and owner_id in (select private.accessible_business_owner_ids()) for update;
  if not found then raise exception 'Inventory item not found'; end if;
  if target_unit.status = 'sold' or target_unit.is_stock_placeholder then raise exception 'Only available units can be sized'; end if;
  if not exists (select 1 from public.products where id = target_unit.product_id and owner_id = target_unit.owner_id and is_template) then raise exception 'Sizes can only be changed here for Sell Multiple listings'; end if;
  update public.inventory_units set variant_size = normalized_size where id = target_unit.id;
  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata)
  values (target_unit.owner_id, 'repeatable_unit_size_set', 'inventory_unit', target_unit.id, jsonb_build_object('variant_size', normalized_size, 'actor_id', auth.uid()));
end;
$$;

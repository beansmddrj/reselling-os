alter table public.products add column restock_status text not null default 'in_stock'
  check (restock_status in ('in_stock', 'temporarily_out', 'restock_soon', 'restock_asap', 'do_not_restock'));

create or replace function public.set_product_restock_status(target_unit_id uuid, new_restock_status text)
returns void language plpgsql set search_path = '' as $$
declare target_unit public.inventory_units;
begin
  if new_restock_status not in ('in_stock', 'temporarily_out', 'restock_soon', 'restock_asap', 'do_not_restock') then raise exception 'Invalid restock status'; end if;
  select * into target_unit from public.inventory_units where id = target_unit_id and owner_id in (select private.accessible_business_owner_ids());
  if not found then raise exception 'Inventory item not found'; end if;
  update public.products set restock_status = new_restock_status where id = target_unit.product_id and owner_id = target_unit.owner_id;
  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata)
  values (target_unit.owner_id, 'restock_status_changed', 'product', target_unit.product_id, jsonb_build_object('restock_status', new_restock_status, 'actor_id', auth.uid()));
end; $$;
revoke execute on function public.set_product_restock_status(uuid, text) from public, anon;
grant execute on function public.set_product_restock_status(uuid, text) to authenticated;

create or replace function private.ensure_repeatable_product_has_available_unit()
returns trigger language plpgsql set search_path = '' as $$
declare sold_unit public.inventory_units; current_listing public.listings; next_status public.inventory_status;
begin
  if not new.is_template or new.restock_status = 'do_not_restock' or exists (select 1 from public.inventory_units where product_id = new.id and owner_id = new.owner_id and status <> 'sold') then return new; end if;
  select * into sold_unit from public.inventory_units where product_id = new.id and owner_id = new.owner_id and status = 'sold' order by updated_at desc limit 1;
  if not found then return new; end if;
  select * into current_listing from public.listings where product_id = new.id and owner_id = new.owner_id order by created_at desc limit 1 for update;
  next_status := case when current_listing.external_url is not null then 'active'::public.inventory_status else 'ready'::public.inventory_status end;
  insert into public.inventory_units (owner_id, product_id, sku, status, acquisition_cost_cents, acquired_at, storage_location)
  values (sold_unit.owner_id, sold_unit.product_id, 'ROS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), next_status, sold_unit.acquisition_cost_cents, now(), sold_unit.storage_location);
  if current_listing.id is not null then update public.listings set status = case when next_status = 'active' then 'active'::public.listing_status else 'ready'::public.listing_status end, ended_at = null where id = current_listing.id; end if;
  return new;
end; $$;

drop trigger if exists products_ensure_repeatable_available_unit on public.products;
create trigger products_ensure_repeatable_available_unit
after update of is_template, restock_status on public.products
for each row execute function private.ensure_repeatable_product_has_available_unit();

create or replace function public.record_inventory_sale(
  target_unit_id uuid, sale_platform public.marketplace_platform, sale_price_cents bigint,
  platform_fee_cents bigint, payment_fee_cents bigint, shipping_cost_cents bigint,
  other_cost_cents bigint, sale_sold_at timestamptz
) returns uuid language plpgsql set search_path = '' as $$
declare target_unit public.inventory_units; target_product public.products; target_listing public.listings; new_sale_id uuid; replacement_unit_id uuid;
begin
  if sale_price_cents <= 0 then raise exception 'Sale price must be greater than zero'; end if;
  if platform_fee_cents < 0 or payment_fee_cents < 0 or shipping_cost_cents < 0 or other_cost_cents < 0 then raise exception 'Sale costs cannot be negative'; end if;
  if sale_sold_at is null or sale_sold_at > now() + interval '5 minutes' then raise exception 'Sold date is invalid'; end if;
  select * into target_unit from public.inventory_units where id = target_unit_id and owner_id in (select private.accessible_business_owner_ids()) for update;
  if not found then raise exception 'Inventory item not found'; end if;
  if target_unit.status = 'sold' or exists (select 1 from public.sales where inventory_unit_id = target_unit.id) then raise exception 'This inventory item is already sold'; end if;
  select * into target_product from public.products where id = target_unit.product_id and owner_id = target_unit.owner_id;
  if target_product.is_template and target_product.restock_status in ('temporarily_out', 'restock_soon', 'restock_asap') then raise exception 'Mark this repeatable product In stock before recording a sale'; end if;
  select * into target_listing from public.listings where product_id = target_unit.product_id and owner_id = target_unit.owner_id order by created_at desc limit 1 for update;
  insert into public.sales (owner_id, inventory_unit_id, listing_id, platform, sale_price_cents, cogs_cents, platform_fee_cents, payment_fee_cents, shipping_cost_cents, other_cost_cents, sold_at)
  values (target_unit.owner_id, target_unit.id, target_listing.id, sale_platform, sale_price_cents, target_unit.acquisition_cost_cents, platform_fee_cents, payment_fee_cents, shipping_cost_cents, other_cost_cents, sale_sold_at) returning id into new_sale_id;
  update public.inventory_units set status = 'sold' where id = target_unit.id;
  if target_product.is_template and target_product.restock_status <> 'do_not_restock' then
    insert into public.inventory_units (owner_id, product_id, sku, status, acquisition_cost_cents, acquired_at, storage_location)
    values (target_unit.owner_id, target_unit.product_id, 'ROS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), target_unit.status, target_unit.acquisition_cost_cents, now(), target_unit.storage_location) returning id into replacement_unit_id;
  elsif target_listing.id is not null then update public.listings set status = 'sold', ended_at = sale_sold_at where id = target_listing.id; end if;
  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata)
  values (target_unit.owner_id, 'sale_recorded', 'sale', new_sale_id, jsonb_build_object('inventory_unit_id', target_unit.id, 'replacement_inventory_unit_id', replacement_unit_id, 'sell_multiple', target_product.is_template, 'actor_id', auth.uid(), 'sale_price_cents', sale_price_cents));
  return new_sale_id;
end; $$;

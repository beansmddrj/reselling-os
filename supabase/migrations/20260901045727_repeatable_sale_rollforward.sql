create or replace function private.ensure_repeatable_product_has_available_unit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  sold_unit public.inventory_units;
  current_listing public.listings;
  next_status public.inventory_status;
begin
  if not new.is_template or exists (
    select 1 from public.inventory_units
    where product_id = new.id and owner_id = new.owner_id and status <> 'sold'
  ) then
    return new;
  end if;

  select * into sold_unit from public.inventory_units
  where product_id = new.id and owner_id = new.owner_id and status = 'sold'
  order by updated_at desc limit 1;
  if not found then return new; end if;

  select * into current_listing from public.listings
  where product_id = new.id and owner_id = new.owner_id
  order by created_at desc limit 1 for update;
  next_status := case when current_listing.external_url is not null then 'active'::public.inventory_status else 'ready'::public.inventory_status end;

  insert into public.inventory_units (owner_id, product_id, sku, status, acquisition_cost_cents, acquired_at, storage_location)
  values (sold_unit.owner_id, sold_unit.product_id, 'ROS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), next_status, sold_unit.acquisition_cost_cents, now(), sold_unit.storage_location);

  if current_listing.id is not null then
    update public.listings set status = case when next_status = 'active' then 'active'::public.listing_status else 'ready'::public.listing_status end, ended_at = null
    where id = current_listing.id;
  end if;
  return new;
end;
$$;

revoke all on function private.ensure_repeatable_product_has_available_unit() from public, anon, authenticated;

drop trigger if exists products_ensure_repeatable_available_unit on public.products;
create trigger products_ensure_repeatable_available_unit
after update of is_template on public.products
for each row execute function private.ensure_repeatable_product_has_available_unit();

-- Repair products that were enabled after their only unit had already sold.
update public.products set is_template = is_template where is_template = true;

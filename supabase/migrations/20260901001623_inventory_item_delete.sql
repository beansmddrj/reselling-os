create or replace function public.delete_inventory_item(target_unit_id uuid)
returns text[]
language plpgsql
set search_path = ''
as $$
declare
  target_unit public.inventory_units;
  remaining_units integer;
  photo_paths text[] := '{}';
begin
  select * into target_unit
  from public.inventory_units
  where id = target_unit_id and owner_id = auth.uid()
  for update;

  if not found then raise exception 'Inventory item not found'; end if;
  if target_unit.status = 'sold' or exists (
    select 1 from public.sales where inventory_unit_id = target_unit.id and owner_id = auth.uid()
  ) then raise exception 'Sold inventory cannot be deleted'; end if;

  select count(*) into remaining_units
  from public.inventory_units
  where product_id = target_unit.product_id and id <> target_unit.id and owner_id = auth.uid();

  if remaining_units = 0 then
    select coalesce(array_agg(storage_path order by position), '{}'::text[]) into photo_paths
    from public.product_photos
    where product_id = target_unit.product_id and owner_id = auth.uid();
  end if;

  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata)
  values (auth.uid(), 'inventory_item_deleted', 'inventory_unit', target_unit.id,
    jsonb_build_object('product_id', target_unit.product_id, 'deleted_product', remaining_units = 0));

  delete from public.inventory_units where id = target_unit.id and owner_id = auth.uid();

  if remaining_units = 0 then
    delete from public.listings where product_id = target_unit.product_id and owner_id = auth.uid();
    delete from public.products where id = target_unit.product_id and owner_id = auth.uid();
  end if;

  return photo_paths;
end;
$$;

revoke execute on function public.delete_inventory_item(uuid) from public, anon;
grant execute on function public.delete_inventory_item(uuid) to authenticated;

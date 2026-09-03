create function public.adjust_bulk_inventory_quantity(
  target_unit_id uuid,
  quantity_delta bigint
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
begin
  if quantity_delta = 0 then raise exception 'Quantity must change'; end if;
  if abs(quantity_delta) > 1000000 then raise exception 'Quantity adjustment is too large'; end if;
  select * into target_unit from public.inventory_units
  where id = target_unit_id and business_id in (select private.accessible_business_ids())
  for update;
  if not found then raise exception 'Inventory item not found'; end if;
  select * into target_product from public.products
  where id = target_unit.product_id and business_id = target_unit.business_id
  for update;
  if not found or target_product.inventory_mode <> 'bulk' then raise exception 'Quantity adjustments are only available for bulk products'; end if;

  if quantity_delta > 0 then
    insert into public.inventory_lots (
      owner_id, business_id, product_id, source_shipment_id, received_quantity,
      available_quantity, unit_cost_cents, notes
    ) values (
      target_unit.owner_id, target_unit.business_id, target_product.id, target_unit.source_shipment_id,
      quantity_delta, quantity_delta, target_unit.acquisition_cost_cents, 'Manual stock adjustment'
    );
  else
    remaining_quantity := abs(quantity_delta);
    for stock_lot in
      select * from public.inventory_lots
      where product_id = target_product.id
        and business_id = target_product.business_id
        and available_quantity > 0
      order by created_at desc, id desc
      for update
    loop
      exit when remaining_quantity = 0;
      quantity_from_lot := least(remaining_quantity, stock_lot.available_quantity);
      update public.inventory_lots
      set available_quantity = available_quantity - quantity_from_lot,
          missing_quantity = missing_quantity + quantity_from_lot
      where id = stock_lot.id;
      remaining_quantity := remaining_quantity - quantity_from_lot;
    end loop;
    if remaining_quantity > 0 then raise exception 'Only % units are available to remove', abs(quantity_delta) - remaining_quantity; end if;
  end if;

  select coalesce(sum(available_quantity), 0) into available_total
  from public.inventory_lots
  where product_id = target_product.id and business_id = target_product.business_id;
  insert into public.business_events (owner_id, business_id, event_type, entity_type, entity_id, metadata)
  values (
    target_unit.owner_id, target_unit.business_id, 'bulk_inventory_quantity_adjusted', 'product', target_product.id,
    jsonb_build_object('inventory_unit_id', target_unit.id, 'quantity_delta', quantity_delta, 'available_quantity', available_total, 'actor_id', auth.uid())
  );
  return available_total;
end;
$$;

revoke execute on function public.adjust_bulk_inventory_quantity(uuid, bigint) from public, anon;
grant execute on function public.adjust_bulk_inventory_quantity(uuid, bigint) to authenticated;

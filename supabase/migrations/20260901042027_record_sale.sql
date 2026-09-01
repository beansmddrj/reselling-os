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
set search_path = ''
as $$
declare
  target_unit public.inventory_units;
  target_listing public.listings;
  new_sale_id uuid;
begin
  if sale_price_cents <= 0 then raise exception 'Sale price must be greater than zero'; end if;
  if platform_fee_cents < 0 or payment_fee_cents < 0 or shipping_cost_cents < 0 or other_cost_cents < 0 then
    raise exception 'Sale costs cannot be negative';
  end if;
  if sale_sold_at is null or sale_sold_at > now() + interval '5 minutes' then
    raise exception 'Sold date is invalid';
  end if;

  select * into target_unit
  from public.inventory_units
  where id = target_unit_id
    and owner_id in (select private.accessible_business_owner_ids())
  for update;
  if not found then raise exception 'Inventory item not found'; end if;
  if target_unit.status = 'sold' or exists (select 1 from public.sales where inventory_unit_id = target_unit.id) then
    raise exception 'This inventory item is already sold';
  end if;

  select * into target_listing
  from public.listings
  where product_id = target_unit.product_id and owner_id = target_unit.owner_id
  order by created_at desc
  limit 1
  for update;

  insert into public.sales (
    owner_id, inventory_unit_id, listing_id, platform, sale_price_cents, cogs_cents,
    platform_fee_cents, payment_fee_cents, shipping_cost_cents, other_cost_cents, sold_at
  ) values (
    target_unit.owner_id, target_unit.id, target_listing.id, sale_platform, sale_price_cents,
    target_unit.acquisition_cost_cents, platform_fee_cents, payment_fee_cents,
    shipping_cost_cents, other_cost_cents, sale_sold_at
  ) returning id into new_sale_id;

  update public.inventory_units set status = 'sold' where id = target_unit.id;
  if target_listing.id is not null then
    update public.listings set status = 'sold', ended_at = sale_sold_at where id = target_listing.id;
  end if;
  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata)
  values (target_unit.owner_id, 'sale_recorded', 'sale', new_sale_id,
    jsonb_build_object('inventory_unit_id', target_unit.id, 'actor_id', auth.uid(), 'sale_price_cents', sale_price_cents));
  return new_sale_id;
end;
$$;

revoke execute on function public.record_inventory_sale(uuid, public.marketplace_platform, bigint, bigint, bigint, bigint, bigint, timestamptz) from public, anon;
grant execute on function public.record_inventory_sale(uuid, public.marketplace_platform, bigint, bigint, bigint, bigint, bigint, timestamptz) to authenticated;

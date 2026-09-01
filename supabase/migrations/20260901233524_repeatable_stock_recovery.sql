-- Existing stock can be completed one physical unit at a time without
-- exposing a broad client-side update path.
create function public.set_repeatable_inventory_unit_size(
  target_unit_id uuid,
  new_unit_size text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_unit public.inventory_units;
  normalized_size text;
begin
  normalized_size := nullif(btrim(new_unit_size), '');
  if normalized_size is null then
    raise exception 'Enter a size for this unit';
  end if;
  if char_length(normalized_size) > 80 then
    raise exception 'Size must be 80 characters or fewer';
  end if;

  select * into target_unit
  from public.inventory_units
  where id = target_unit_id
    and owner_id in (select private.accessible_business_owner_ids())
  for update;
  if not found then
    raise exception 'Inventory item not found';
  end if;
  if target_unit.status = 'sold' then
    raise exception 'Sold units cannot be changed';
  end if;
  if not exists (
    select 1
    from public.products
    where id = target_unit.product_id
      and owner_id = target_unit.owner_id
      and is_template
  ) then
    raise exception 'Sizes can only be changed here for Sell Multiple listings';
  end if;

  update public.inventory_units
  set variant_size = normalized_size
  where id = target_unit.id;

  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata)
  values (
    target_unit.owner_id,
    'repeatable_unit_size_set',
    'inventory_unit',
    target_unit.id,
    jsonb_build_object('variant_size', normalized_size, 'actor_id', auth.uid())
  );
end;
$$;

revoke execute on function public.set_repeatable_inventory_unit_size(uuid, text) from public, anon;
grant execute on function public.set_repeatable_inventory_unit_size(uuid, text) to authenticated;

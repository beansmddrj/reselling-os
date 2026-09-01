alter table public.products add column archived_at timestamptz;

create or replace function public.set_inventory_product_archived(target_unit_id uuid, should_archive boolean)
returns void language plpgsql set search_path = '' as $$
declare target_unit public.inventory_units;
begin
  select * into target_unit
  from public.inventory_units
  where id = target_unit_id
    and owner_id in (select private.accessible_business_owner_ids());
  if not found then raise exception 'Inventory item not found'; end if;

  update public.products
  set archived_at = case when should_archive then now() else null end
  where id = target_unit.product_id and owner_id = target_unit.owner_id;

  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata)
  values (target_unit.owner_id, case when should_archive then 'product_archived' else 'product_restored' end,
    'product', target_unit.product_id, jsonb_build_object('actor_id', auth.uid()));
end; $$;

revoke execute on function public.set_inventory_product_archived(uuid, boolean) from public, anon;
grant execute on function public.set_inventory_product_archived(uuid, boolean) to authenticated;

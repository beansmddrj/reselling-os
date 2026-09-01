alter table public.business_events add column actor_id uuid;

update public.business_events
set actor_id = (metadata ->> 'actor_id')::uuid
where metadata ->> 'actor_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

create or replace function private.business_events_set_actor()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.actor_id := coalesce(
    case when new.metadata ->> 'actor_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (new.metadata ->> 'actor_id')::uuid end,
    auth.uid()
  );
  return new;
end; $$;

create trigger business_events_capture_actor before insert on public.business_events
for each row execute function private.business_events_set_actor();

revoke select on table public.business_events from authenticated;
grant select (id, owner_id, event_type, entity_type, entity_id, actor_id, occurred_at) on table public.business_events to authenticated;

revoke select on table public.sales from authenticated;
grant select (id, owner_id, inventory_unit_id, listing_id, platform, sale_price_cents, sold_at, created_at) on table public.sales to authenticated;

create or replace function private.owner_sales_financials(target_owner_id uuid)
returns table (
  id uuid, inventory_unit_id uuid, listing_id uuid, platform public.marketplace_platform,
  sale_price_cents bigint, cogs_cents bigint, platform_fee_cents bigint,
  payment_fee_cents bigint, shipping_cost_cents bigint, other_cost_cents bigint,
  sold_at timestamptz, created_at timestamptz
) language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or auth.uid() <> target_owner_id then raise exception 'Owner access required'; end if;
  return query select s.id, s.inventory_unit_id, s.listing_id, s.platform, s.sale_price_cents,
    s.cogs_cents, s.platform_fee_cents, s.payment_fee_cents, s.shipping_cost_cents,
    s.other_cost_cents, s.sold_at, s.created_at
  from public.sales s where s.owner_id = target_owner_id order by s.sold_at desc;
end; $$;

revoke execute on function private.owner_sales_financials(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.owner_sales_financials(uuid) to authenticated;

create or replace function public.get_owner_sales_financials(target_owner_id uuid)
returns table (
  id uuid, inventory_unit_id uuid, listing_id uuid, platform public.marketplace_platform,
  sale_price_cents bigint, cogs_cents bigint, platform_fee_cents bigint,
  payment_fee_cents bigint, shipping_cost_cents bigint, other_cost_cents bigint,
  sold_at timestamptz, created_at timestamptz
) language sql security invoker set search_path = '' as $$
  select * from private.owner_sales_financials(target_owner_id);
$$;

revoke execute on function public.get_owner_sales_financials(uuid) from public, anon;
grant execute on function public.get_owner_sales_financials(uuid) to authenticated;

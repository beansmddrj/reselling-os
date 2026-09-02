-- Existing database functions still write owner-scoped rows during the staged
-- tenant conversion. Keep those writes valid while ensuring every new row has
-- a Business link; the following migration will make callers pass it directly.

create or replace function private.assign_legacy_business_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.business_id is null then
    select business.id into new.business_id
    from public.businesses business
    where business.owner_id = new.owner_id
    order by (business.id = business.owner_id) desc, business.created_at
    limit 1;
  end if;
  if new.business_id is null then
    raise exception 'A business workspace is required';
  end if;
  return new;
end;
$$;

revoke execute on function private.assign_legacy_business_id() from public, anon, authenticated;

create trigger products_assign_legacy_business_id before insert on public.products for each row execute function private.assign_legacy_business_id();
create trigger inventory_units_assign_legacy_business_id before insert on public.inventory_units for each row execute function private.assign_legacy_business_id();
create trigger listings_assign_legacy_business_id before insert on public.listings for each row execute function private.assign_legacy_business_id();
create trigger sales_assign_legacy_business_id before insert on public.sales for each row execute function private.assign_legacy_business_id();
create trigger business_events_assign_legacy_business_id before insert on public.business_events for each row execute function private.assign_legacy_business_id();
create trigger intake_drafts_assign_legacy_business_id before insert on public.intake_drafts for each row execute function private.assign_legacy_business_id();
create trigger product_photos_assign_legacy_business_id before insert on public.product_photos for each row execute function private.assign_legacy_business_id();
create trigger sale_moments_assign_legacy_business_id before insert on public.sale_moments for each row execute function private.assign_legacy_business_id();
create trigger business_expenses_assign_legacy_business_id before insert on public.business_expenses for each row execute function private.assign_legacy_business_id();
create trigger inbound_shipments_assign_legacy_business_id before insert on public.inbound_shipments for each row execute function private.assign_legacy_business_id();
create trigger inbound_shipment_financials_assign_legacy_business_id before insert on public.inbound_shipment_financials for each row execute function private.assign_legacy_business_id();
create trigger inbound_packages_assign_legacy_business_id before insert on public.inbound_packages for each row execute function private.assign_legacy_business_id();
create trigger inbound_receipts_assign_legacy_business_id before insert on public.inbound_receipts for each row execute function private.assign_legacy_business_id();

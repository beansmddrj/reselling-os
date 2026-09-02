-- Enforce the workspace boundary at the database layer.  The legacy owner_id
-- stays for owner-only financial visibility, while business_id decides which
-- workspace a signed-in user may access.

drop policy "products_team" on public.products;
create policy "products_business" on public.products for all to authenticated
using (business_id in (select private.accessible_business_ids()))
with check (business_id in (select private.accessible_business_ids()));

drop policy "inventory_units_team" on public.inventory_units;
create policy "inventory_units_business" on public.inventory_units for all to authenticated
using (business_id in (select private.accessible_business_ids()))
with check (business_id in (select private.accessible_business_ids()));

drop policy "listings_team" on public.listings;
create policy "listings_business" on public.listings for all to authenticated
using (business_id in (select private.accessible_business_ids()))
with check (business_id in (select private.accessible_business_ids()));

drop policy "sales_team" on public.sales;
create policy "sales_business" on public.sales for all to authenticated
using (business_id in (select private.accessible_business_ids()))
with check (business_id in (select private.accessible_business_ids()));

drop policy "business_events_team" on public.business_events;
create policy "business_events_business" on public.business_events for all to authenticated
using (business_id in (select private.accessible_business_ids()))
with check (business_id in (select private.accessible_business_ids()));

drop policy "intake_drafts_team" on public.intake_drafts;
create policy "intake_drafts_business" on public.intake_drafts for all to authenticated
using (business_id in (select private.accessible_business_ids()))
with check (business_id in (select private.accessible_business_ids()));

drop policy "product_photos_team" on public.product_photos;
create policy "product_photos_business" on public.product_photos for all to authenticated
using (business_id in (select private.accessible_business_ids()))
with check (business_id in (select private.accessible_business_ids()));

drop policy "business_expenses_owner_only" on public.business_expenses;
create policy "business_expenses_owner_only" on public.business_expenses for all to authenticated
using (
  owner_id = (select auth.uid())
  and business_id in (select private.accessible_business_ids())
)
with check (
  owner_id = (select auth.uid())
  and business_id in (select private.accessible_business_ids())
);

drop policy "sale_moments_team_read" on public.sale_moments;
drop policy "sale_moments_team_insert" on public.sale_moments;
drop policy "sale_moments_team_delete" on public.sale_moments;
create policy "sale_moments_business_read" on public.sale_moments for select to authenticated
using (business_id in (select private.accessible_business_ids()));
create policy "sale_moments_business_insert" on public.sale_moments for insert to authenticated
with check (
  business_id in (select private.accessible_business_ids())
  and exists (
    select 1 from public.sales sale
    where sale.id = sale_id and sale.business_id = sale_moments.business_id
  )
);
create policy "sale_moments_business_delete" on public.sale_moments for delete to authenticated
using (business_id in (select private.accessible_business_ids()));

drop policy "inbound_shipments_team_read" on public.inbound_shipments;
drop policy "inbound_shipments_owner_write" on public.inbound_shipments;
create policy "inbound_shipments_business_read" on public.inbound_shipments for select to authenticated
using (
  business_id in (select private.accessible_business_ids())
  and (visibility = 'standard' or owner_id = (select auth.uid()))
);
create policy "inbound_shipments_owner_write" on public.inbound_shipments for all to authenticated
using (owner_id = (select auth.uid()) and business_id in (select private.accessible_business_ids()))
with check (owner_id = (select auth.uid()) and business_id in (select private.accessible_business_ids()));

drop policy "inbound_financials_owner_only" on public.inbound_shipment_financials;
create policy "inbound_financials_owner_only" on public.inbound_shipment_financials for all to authenticated
using (owner_id = (select auth.uid()) and business_id in (select private.accessible_business_ids()))
with check (owner_id = (select auth.uid()) and business_id in (select private.accessible_business_ids()));

drop policy "inbound_packages_team_read" on public.inbound_packages;
drop policy "inbound_packages_owner_write" on public.inbound_packages;
create policy "inbound_packages_business_read" on public.inbound_packages for select to authenticated
using (
  business_id in (select private.accessible_business_ids())
  and exists (
    select 1 from public.inbound_shipments shipment
    where shipment.id = shipment_id
      and shipment.business_id = inbound_packages.business_id
      and (shipment.visibility = 'standard' or shipment.owner_id = (select auth.uid()))
  )
);
create policy "inbound_packages_owner_write" on public.inbound_packages for all to authenticated
using (owner_id = (select auth.uid()) and business_id in (select private.accessible_business_ids()))
with check (owner_id = (select auth.uid()) and business_id in (select private.accessible_business_ids()));

drop policy "inbound_receipts_team_read" on public.inbound_receipts;
drop policy "inbound_receipts_owner_write" on public.inbound_receipts;
create policy "inbound_receipts_business_read" on public.inbound_receipts for select to authenticated
using (
  business_id in (select private.accessible_business_ids())
  and exists (
    select 1 from public.inbound_shipments shipment
    where shipment.id = shipment_id
      and shipment.business_id = inbound_receipts.business_id
      and (shipment.visibility = 'standard' or shipment.owner_id = (select auth.uid()))
  )
);
create policy "inbound_receipts_owner_write" on public.inbound_receipts for all to authenticated
using (owner_id = (select auth.uid()) and business_id in (select private.accessible_business_ids()))
with check (owner_id = (select auth.uid()) and business_id in (select private.accessible_business_ids()));

drop policy "intake_photos_select_team" on storage.objects;
drop policy "intake_photos_insert_team" on storage.objects;
drop policy "intake_photos_update_team" on storage.objects;
drop policy "intake_photos_delete_team" on storage.objects;
create policy "intake_photos_select_business" on storage.objects for select to authenticated
using (bucket_id = 'intake-photos' and (storage.foldername(name))[1] in (select id::text from private.accessible_business_ids() as id));
create policy "intake_photos_insert_business" on storage.objects for insert to authenticated
with check (bucket_id = 'intake-photos' and (storage.foldername(name))[1] in (select id::text from private.accessible_business_ids() as id));
create policy "intake_photos_update_business" on storage.objects for update to authenticated
using (bucket_id = 'intake-photos' and (storage.foldername(name))[1] in (select id::text from private.accessible_business_ids() as id))
with check (bucket_id = 'intake-photos' and (storage.foldername(name))[1] in (select id::text from private.accessible_business_ids() as id));
create policy "intake_photos_delete_business" on storage.objects for delete to authenticated
using (bucket_id = 'intake-photos' and (storage.foldername(name))[1] in (select id::text from private.accessible_business_ids() as id));

drop policy "sale_moments_storage_select_team" on storage.objects;
drop policy "sale_moments_storage_insert_team" on storage.objects;
drop policy "sale_moments_storage_delete_team" on storage.objects;
create policy "sale_moments_storage_select_business" on storage.objects for select to authenticated
using (bucket_id = 'sale-moments' and (storage.foldername(name))[1] in (select id::text from private.accessible_business_ids() as id));
create policy "sale_moments_storage_insert_business" on storage.objects for insert to authenticated
with check (bucket_id = 'sale-moments' and (storage.foldername(name))[1] in (select id::text from private.accessible_business_ids() as id));
create policy "sale_moments_storage_delete_business" on storage.objects for delete to authenticated
using (bucket_id = 'sale-moments' and (storage.foldername(name))[1] in (select id::text from private.accessible_business_ids() as id));

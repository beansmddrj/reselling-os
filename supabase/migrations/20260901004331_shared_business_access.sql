create type public.business_role as enum ('owner', 'member');

create table public.business_members (
  business_owner_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.business_role not null,
  joined_at timestamptz not null default now(),
  primary key (business_owner_id, user_id),
  constraint business_owner_role check (user_id <> business_owner_id or role = 'owner')
);

create index business_members_user_id_idx on public.business_members(user_id, business_owner_id);
create unique index business_members_one_joined_business_idx on public.business_members(user_id) where role = 'member';

insert into public.business_members (business_owner_id, user_id, role)
select id, id, 'owner' from public.profiles
on conflict do nothing;

create table public.business_invites (
  id uuid primary key default gen_random_uuid(),
  business_owner_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint business_invites_email check (position('@' in email) > 1)
);

create unique index business_invites_pending_email_idx
on public.business_invites (business_owner_id, lower(email))
where accepted_at is null;
create index business_invites_email_idx on public.business_invites(lower(email)) where accepted_at is null;

alter table public.business_members enable row level security;
alter table public.business_invites enable row level security;
revoke all on table public.business_members from public, anon;
revoke all on table public.business_invites from public, anon;
revoke usage on type public.business_role from anon;
grant usage on type public.business_role to authenticated;

create schema if not exists private;

create or replace function private.accessible_business_owner_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select business_owner_id
  from public.business_members
  where user_id = (select auth.uid())
$$;

revoke all on schema private from public, anon;
revoke execute on function private.accessible_business_owner_ids() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.accessible_business_owner_ids() to authenticated;

create policy "business_members_read_team" on public.business_members for select to authenticated
using (business_owner_id in (select private.accessible_business_owner_ids()));

create policy "business_members_accept_invite" on public.business_members for insert to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'member'
  and exists (
    select 1 from public.business_invites invitation
    where invitation.business_owner_id = business_members.business_owner_id
      and invitation.accepted_at is null
      and lower(invitation.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
);

create policy "business_members_owner_delete" on public.business_members for delete to authenticated
using (business_owner_id = (select auth.uid()) and user_id <> business_owner_id);

create policy "business_invites_owner_read" on public.business_invites for select to authenticated
using (business_owner_id = (select auth.uid()));
create policy "business_invites_recipient_read" on public.business_invites for select to authenticated
using (accepted_at is null and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), '')));
create policy "business_invites_owner_insert" on public.business_invites for insert to authenticated
with check (business_owner_id = (select auth.uid()) and invited_by = (select auth.uid()));
create policy "business_invites_owner_delete" on public.business_invites for delete to authenticated
using (business_owner_id = (select auth.uid()));
create policy "business_invites_recipient_accept" on public.business_invites for update to authenticated
using (accepted_at is null and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), '')))
with check (accepted_at is not null and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), '')));

grant select, insert, delete on table public.business_members to authenticated;
grant select, insert, update, delete on table public.business_invites to authenticated;

create or replace function public.accept_business_invite(invite_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare invitation public.business_invites;
begin
  select * into invitation from public.business_invites
  where id = invite_id
    and accepted_at is null
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  for update;
  if not found then raise exception 'This invitation is not available for your account'; end if;
  if invitation.business_owner_id = auth.uid() then raise exception 'The business owner is already a member'; end if;
  insert into public.business_members (business_owner_id, user_id, role)
  values (invitation.business_owner_id, auth.uid(), 'member');
  update public.business_invites set accepted_at = now() where id = invitation.id;
end;
$$;

revoke execute on function public.accept_business_invite(uuid) from public, anon;
grant execute on function public.accept_business_invite(uuid) to authenticated;

drop policy "profiles_select_own" on public.profiles;
create policy "profiles_select_team" on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1 from public.business_members member
    where member.user_id = profiles.id
      and member.business_owner_id in (select private.accessible_business_owner_ids())
  )
);

drop policy "products_own" on public.products;
create policy "products_team" on public.products for all to authenticated
using (owner_id in (select private.accessible_business_owner_ids()))
with check (owner_id in (select private.accessible_business_owner_ids()));
drop policy "inventory_units_own" on public.inventory_units;
create policy "inventory_units_team" on public.inventory_units for all to authenticated
using (owner_id in (select private.accessible_business_owner_ids()))
with check (owner_id in (select private.accessible_business_owner_ids()));
drop policy "listings_own" on public.listings;
create policy "listings_team" on public.listings for all to authenticated
using (owner_id in (select private.accessible_business_owner_ids()))
with check (owner_id in (select private.accessible_business_owner_ids()));
drop policy "sales_own" on public.sales;
create policy "sales_team" on public.sales for all to authenticated
using (owner_id in (select private.accessible_business_owner_ids()))
with check (owner_id in (select private.accessible_business_owner_ids()));
drop policy "business_events_own" on public.business_events;
create policy "business_events_team" on public.business_events for all to authenticated
using (owner_id in (select private.accessible_business_owner_ids()))
with check (owner_id in (select private.accessible_business_owner_ids()));
drop policy "intake_drafts_own" on public.intake_drafts;
create policy "intake_drafts_team" on public.intake_drafts for all to authenticated
using (owner_id in (select private.accessible_business_owner_ids()))
with check (owner_id in (select private.accessible_business_owner_ids()));
drop policy "product_photos_own" on public.product_photos;
create policy "product_photos_team" on public.product_photos for all to authenticated
using (owner_id in (select private.accessible_business_owner_ids()))
with check (owner_id in (select private.accessible_business_owner_ids()));

drop policy "intake_photos_select_own" on storage.objects;
drop policy "intake_photos_insert_own" on storage.objects;
drop policy "intake_photos_update_own" on storage.objects;
drop policy "intake_photos_delete_own" on storage.objects;
create policy "intake_photos_select_team" on storage.objects for select to authenticated
using (bucket_id = 'intake-photos' and (storage.foldername(name))[1] in (select id::text from private.accessible_business_owner_ids() as id));
create policy "intake_photos_insert_team" on storage.objects for insert to authenticated
with check (bucket_id = 'intake-photos' and (storage.foldername(name))[1] in (select id::text from private.accessible_business_owner_ids() as id));
create policy "intake_photos_update_team" on storage.objects for update to authenticated
using (bucket_id = 'intake-photos' and (storage.foldername(name))[1] in (select id::text from private.accessible_business_owner_ids() as id))
with check (bucket_id = 'intake-photos' and (storage.foldername(name))[1] in (select id::text from private.accessible_business_owner_ids() as id));
create policy "intake_photos_delete_team" on storage.objects for delete to authenticated
using (bucket_id = 'intake-photos' and (storage.foldername(name))[1] in (select id::text from private.accessible_business_owner_ids() as id));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email));
  insert into public.business_members (business_owner_id, user_id, role)
  values (new.id, new.id, 'owner');
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.finalize_intake_draft(draft_id uuid)
returns table (product_id uuid, inventory_unit_id uuid, listing_id uuid)
language plpgsql
set search_path = ''
as $$
declare
  draft public.intake_drafts;
  new_product_id uuid;
  new_inventory_unit_id uuid;
  new_listing_id uuid;
  photo_path text;
  photo_position integer := 0;
begin
  select * into draft from public.intake_drafts
  where id = draft_id and owner_id in (select private.accessible_business_owner_ids())
  for update;
  if not found then raise exception 'Intake draft not found'; end if;
  if trim(draft.name) = '' then raise exception 'Product name is required'; end if;
  if draft.acquisition_cost_cents is null then raise exception 'Acquisition cost is required'; end if;
  if draft.asking_price_cents is null then raise exception 'Asking price is required'; end if;
  if coalesce(array_length(draft.photo_paths, 1), 0) < 1 then raise exception 'At least one photo is required'; end if;

  insert into public.products (owner_id, name, brand, category, size, color, condition, description, default_asking_price_cents, default_cost_cents)
  values (draft.owner_id, trim(draft.name), nullif(trim(draft.brand), ''), nullif(trim(draft.category), ''), nullif(trim(draft.size), ''), nullif(trim(draft.color), ''), nullif(trim(draft.condition), ''), nullif(trim(draft.description), ''), draft.asking_price_cents, draft.acquisition_cost_cents)
  returning id into new_product_id;
  insert into public.inventory_units (owner_id, product_id, sku, status, acquisition_cost_cents, storage_location)
  values (draft.owner_id, new_product_id, 'ROS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), 'draft', draft.acquisition_cost_cents, nullif(trim(draft.storage_location), ''))
  returning id into new_inventory_unit_id;
  insert into public.listings (owner_id, product_id, platform, status, title, description, asking_price_cents)
  values (draft.owner_id, new_product_id, 'facebook', 'draft', trim(draft.name), nullif(trim(draft.description), ''), draft.asking_price_cents)
  returning id into new_listing_id;
  foreach photo_path in array draft.photo_paths loop
    insert into public.product_photos (owner_id, product_id, storage_path, position)
    values (draft.owner_id, new_product_id, photo_path, photo_position);
    photo_position := photo_position + 1;
  end loop;
  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata)
  values (draft.owner_id, 'intake_draft_finalized', 'product', new_product_id,
    jsonb_build_object('inventory_unit_id', new_inventory_unit_id, 'listing_id', new_listing_id, 'actor_id', auth.uid()));
  delete from public.intake_drafts where id = draft.id;
  return query select new_product_id, new_inventory_unit_id, new_listing_id;
end;
$$;

create or replace function public.update_inventory_item(
  target_unit_id uuid, product_name text, product_brand text, product_category text,
  product_size text, product_color text, product_condition text, product_description text,
  unit_cost_cents bigint, unit_storage_location text, listing_title text,
  listing_description text, listing_asking_price_cents bigint
)
returns void language plpgsql set search_path = '' as $$
declare target_unit public.inventory_units; target_listing_id uuid;
begin
  if trim(product_name) = '' then raise exception 'Product name is required'; end if;
  if trim(listing_title) = '' then raise exception 'Listing title is required'; end if;
  if unit_cost_cents < 0 or listing_asking_price_cents < 0 then raise exception 'Prices cannot be negative'; end if;
  select * into target_unit from public.inventory_units
  where id = target_unit_id and owner_id in (select private.accessible_business_owner_ids()) for update;
  if not found then raise exception 'Inventory item not found'; end if;
  update public.products set name = trim(product_name), brand = nullif(trim(product_brand), ''), category = nullif(trim(product_category), ''), size = nullif(trim(product_size), ''), color = nullif(trim(product_color), ''), condition = nullif(trim(product_condition), ''), description = nullif(trim(product_description), ''), default_cost_cents = unit_cost_cents, default_asking_price_cents = listing_asking_price_cents
  where id = target_unit.product_id and owner_id = target_unit.owner_id;
  update public.inventory_units set acquisition_cost_cents = unit_cost_cents, storage_location = nullif(trim(unit_storage_location), '')
  where id = target_unit.id and owner_id = target_unit.owner_id;
  select id into target_listing_id from public.listings where product_id = target_unit.product_id and owner_id = target_unit.owner_id order by created_at desc limit 1 for update;
  if target_listing_id is null then raise exception 'Listing draft not found'; end if;
  update public.listings set title = trim(listing_title), description = nullif(trim(listing_description), ''), asking_price_cents = listing_asking_price_cents
  where id = target_listing_id and owner_id = target_unit.owner_id;
  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata)
  values (target_unit.owner_id, 'inventory_item_edited', 'inventory_unit', target_unit.id,
    jsonb_build_object('product_id', target_unit.product_id, 'listing_id', target_listing_id, 'actor_id', auth.uid()));
end;
$$;

create or replace function public.delete_inventory_item(target_unit_id uuid)
returns text[] language plpgsql set search_path = '' as $$
declare target_unit public.inventory_units; remaining_units integer; photo_paths text[] := '{}';
begin
  select * into target_unit from public.inventory_units
  where id = target_unit_id and owner_id in (select private.accessible_business_owner_ids()) for update;
  if not found then raise exception 'Inventory item not found'; end if;
  if target_unit.status = 'sold' or exists (select 1 from public.sales where inventory_unit_id = target_unit.id and owner_id = target_unit.owner_id) then raise exception 'Sold inventory cannot be deleted'; end if;
  select count(*) into remaining_units from public.inventory_units where product_id = target_unit.product_id and id <> target_unit.id and owner_id = target_unit.owner_id;
  if remaining_units = 0 then
    select coalesce(array_agg(storage_path order by position), '{}'::text[]) into photo_paths from public.product_photos where product_id = target_unit.product_id and owner_id = target_unit.owner_id;
  end if;
  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata)
  values (target_unit.owner_id, 'inventory_item_deleted', 'inventory_unit', target_unit.id,
    jsonb_build_object('product_id', target_unit.product_id, 'deleted_product', remaining_units = 0, 'actor_id', auth.uid()));
  delete from public.inventory_units where id = target_unit.id and owner_id = target_unit.owner_id;
  if remaining_units = 0 then
    delete from public.listings where product_id = target_unit.product_id and owner_id = target_unit.owner_id;
    delete from public.products where id = target_unit.product_id and owner_id = target_unit.owner_id;
  end if;
  return photo_paths;
end;
$$;

create or replace function public.transition_inventory_item(target_unit_id uuid, target_status public.inventory_status, listing_external_url text default null)
returns void language plpgsql set search_path = '' as $$
declare target_unit public.inventory_units; target_product public.products; target_listing public.listings; normalized_url text := nullif(trim(listing_external_url), ''); photo_count integer;
begin
  select * into target_unit from public.inventory_units where id = target_unit_id and owner_id in (select private.accessible_business_owner_ids()) for update;
  if not found then raise exception 'Inventory item not found'; end if;
  if target_unit.status = 'sold' then raise exception 'Sold inventory cannot change status'; end if;
  select * into target_product from public.products where id = target_unit.product_id and owner_id = target_unit.owner_id;
  select * into target_listing from public.listings where product_id = target_unit.product_id and owner_id = target_unit.owner_id order by created_at desc limit 1 for update;
  if target_listing.id is null then raise exception 'Listing draft not found'; end if;
  if target_unit.status = 'draft' and target_status = 'ready' then
    select count(*) into photo_count from public.product_photos where product_id = target_unit.product_id and owner_id = target_unit.owner_id;
    if trim(target_product.name) = '' then raise exception 'Product name is required'; end if;
    if trim(target_listing.title) = '' then raise exception 'Listing title is required'; end if;
    if coalesce(trim(target_listing.description), '') = '' then raise exception 'Listing description is required'; end if;
    if target_listing.asking_price_cents <= 0 then raise exception 'Asking price must be greater than zero'; end if;
    if photo_count < 1 then raise exception 'At least one product photo is required'; end if;
    update public.inventory_units set status = 'ready' where id = target_unit.id;
    update public.listings set status = 'ready', ended_at = null where id = target_listing.id;
  elsif target_unit.status = 'ready' and target_status = 'active' then
    if normalized_url is null or normalized_url !~* '^https?://[^[:space:]]+$' then raise exception 'Enter a valid marketplace listing URL'; end if;
    update public.inventory_units set status = 'active' where id = target_unit.id;
    update public.listings set status = 'active', external_url = normalized_url, posted_at = coalesce(posted_at, now()), ended_at = null where id = target_listing.id;
  elsif target_unit.status = 'active' and target_status = 'ready' then
    update public.inventory_units set status = 'ready' where id = target_unit.id;
    update public.listings set status = 'ready', ended_at = now() where id = target_listing.id;
  else
    raise exception 'Invalid inventory status transition from % to %', target_unit.status, target_status;
  end if;
  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata)
  values (target_unit.owner_id, 'inventory_status_changed', 'inventory_unit', target_unit.id,
    jsonb_build_object('from_status', target_unit.status, 'to_status', target_status, 'product_id', target_unit.product_id, 'listing_id', target_listing.id, 'external_url', normalized_url, 'actor_id', auth.uid()));
end;
$$;

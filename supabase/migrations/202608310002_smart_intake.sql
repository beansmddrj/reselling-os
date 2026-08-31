-- Smart Intake v0.1: recoverable drafts, ordered photos, and atomic finalization.

create type public.intake_step as enum ('photos', 'review');

create table public.intake_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  step public.intake_step not null default 'photos',
  name text not null default '',
  brand text,
  category text,
  size text,
  color text,
  condition text,
  description text,
  acquisition_cost_cents bigint check (acquisition_cost_cents is null or acquisition_cost_cents >= 0),
  asking_price_cents bigint check (asking_price_cents is null or asking_price_cents >= 0),
  storage_location text,
  photo_paths text[] not null default '{}' check (cardinality(photo_paths) <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  position smallint not null check (position between 0 and 4),
  created_at timestamptz not null default now(),
  unique (product_id, position),
  unique (owner_id, storage_path)
);

create index intake_drafts_owner_id_idx on public.intake_drafts(owner_id);
create index product_photos_product_id_idx on public.product_photos(product_id, position);

create trigger intake_drafts_set_updated_at before update on public.intake_drafts
for each row execute function public.set_updated_at();

alter table public.intake_drafts enable row level security;
alter table public.product_photos enable row level security;

create policy "intake_drafts_own" on public.intake_drafts for all
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "product_photos_own" on public.product_photos for all
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('intake-photos', 'intake-photos', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

create policy "intake_photos_select_own" on storage.objects for select to authenticated
using (bucket_id = 'intake-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "intake_photos_insert_own" on storage.objects for insert to authenticated
with check (bucket_id = 'intake-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "intake_photos_update_own" on storage.objects for update to authenticated
using (bucket_id = 'intake-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "intake_photos_delete_own" on storage.objects for delete to authenticated
using (bucket_id = 'intake-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

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
  where id = draft_id and owner_id = auth.uid()
  for update;

  if not found then raise exception 'Intake draft not found'; end if;
  if trim(draft.name) = '' then raise exception 'Product name is required'; end if;
  if draft.acquisition_cost_cents is null then raise exception 'Acquisition cost is required'; end if;
  if draft.asking_price_cents is null then raise exception 'Asking price is required'; end if;
  if coalesce(array_length(draft.photo_paths, 1), 0) < 1 then raise exception 'At least one photo is required'; end if;

  insert into public.products (
    owner_id, name, brand, category, size, color, condition, description,
    default_asking_price_cents, default_cost_cents
  ) values (
    draft.owner_id, trim(draft.name), nullif(trim(draft.brand), ''), nullif(trim(draft.category), ''),
    nullif(trim(draft.size), ''), nullif(trim(draft.color), ''), nullif(trim(draft.condition), ''),
    nullif(trim(draft.description), ''), draft.asking_price_cents, draft.acquisition_cost_cents
  ) returning id into new_product_id;

  insert into public.inventory_units (
    owner_id, product_id, sku, status, acquisition_cost_cents, storage_location
  ) values (
    draft.owner_id, new_product_id,
    'ROS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    'draft', draft.acquisition_cost_cents, nullif(trim(draft.storage_location), '')
  ) returning id into new_inventory_unit_id;

  insert into public.listings (
    owner_id, product_id, platform, status, title, description, asking_price_cents
  ) values (
    draft.owner_id, new_product_id, 'facebook', 'draft', trim(draft.name),
    nullif(trim(draft.description), ''), draft.asking_price_cents
  ) returning id into new_listing_id;

  foreach photo_path in array draft.photo_paths loop
    insert into public.product_photos (owner_id, product_id, storage_path, position)
    values (draft.owner_id, new_product_id, photo_path, photo_position);
    photo_position := photo_position + 1;
  end loop;

  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata)
  values (
    draft.owner_id, 'intake_draft_finalized', 'product', new_product_id,
    jsonb_build_object('inventory_unit_id', new_inventory_unit_id, 'listing_id', new_listing_id)
  );

  delete from public.intake_drafts where id = draft.id;
  return query select new_product_id, new_inventory_unit_id, new_listing_id;
end;
$$;

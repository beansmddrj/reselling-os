-- Reselling OS v0.1 initial schema
-- Physical inventory, marketplace listings, realized sales, and audit history.

create extension if not exists pgcrypto;

create type public.inventory_status as enum ('draft', 'ready', 'active', 'sold');
create type public.listing_status as enum ('draft', 'ready', 'active', 'ended', 'sold');
create type public.marketplace_platform as enum ('facebook', 'ebay', 'other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  brand text,
  category text,
  size text,
  color text,
  condition text,
  description text,
  is_template boolean not null default false,
  default_asking_price_cents bigint check (default_asking_price_cents is null or default_asking_price_cents >= 0),
  default_cost_cents bigint check (default_cost_cents is null or default_cost_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_units (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  sku text not null,
  status public.inventory_status not null default 'draft',
  acquisition_cost_cents bigint not null check (acquisition_cost_cents >= 0),
  acquired_at timestamptz not null default now(),
  storage_location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, sku)
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  platform public.marketplace_platform not null,
  status public.listing_status not null default 'draft',
  external_listing_id text,
  external_url text,
  title text not null,
  description text,
  asking_price_cents bigint not null check (asking_price_cents >= 0),
  minimum_price_cents bigint check (minimum_price_cents is null or minimum_price_cents >= 0),
  original_ai_title text,
  original_ai_description text,
  original_ai_asking_price_cents bigint check (original_ai_asking_price_cents is null or original_ai_asking_price_cents >= 0),
  posted_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, external_listing_id)
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  inventory_unit_id uuid not null references public.inventory_units(id) on delete restrict,
  listing_id uuid references public.listings(id) on delete set null,
  platform public.marketplace_platform not null,
  sale_price_cents bigint not null check (sale_price_cents >= 0),
  cogs_cents bigint not null check (cogs_cents >= 0),
  platform_fee_cents bigint not null default 0 check (platform_fee_cents >= 0),
  payment_fee_cents bigint not null default 0 check (payment_fee_cents >= 0),
  shipping_cost_cents bigint not null default 0 check (shipping_cost_cents >= 0),
  other_cost_cents bigint not null default 0 check (other_cost_cents >= 0),
  sold_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (inventory_unit_id)
);

create table public.business_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index products_owner_id_idx on public.products(owner_id);
create index inventory_units_owner_id_idx on public.inventory_units(owner_id);
create index inventory_units_product_id_idx on public.inventory_units(product_id);
create index inventory_units_status_idx on public.inventory_units(owner_id, status);
create index listings_owner_id_idx on public.listings(owner_id);
create index listings_product_id_idx on public.listings(product_id);
create index listings_status_idx on public.listings(owner_id, status);
create index sales_owner_id_idx on public.sales(owner_id);
create index sales_sold_at_idx on public.sales(owner_id, sold_at desc);
create index business_events_owner_id_idx on public.business_events(owner_id);
create index business_events_entity_idx on public.business_events(entity_type, entity_id);
create index business_events_occurred_at_idx on public.business_events(owner_id, occurred_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger inventory_units_set_updated_at before update on public.inventory_units for each row execute function public.set_updated_at();
create trigger listings_set_updated_at before update on public.listings for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.inventory_units enable row level security;
alter table public.listings enable row level security;
alter table public.sales enable row level security;
alter table public.business_events enable row level security;

create policy "profiles_select_own" on public.profiles for select using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "products_own" on public.products for all using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "inventory_units_own" on public.inventory_units for all using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "listings_own" on public.listings for all using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "sales_own" on public.sales for all using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "business_events_own" on public.business_events for all using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

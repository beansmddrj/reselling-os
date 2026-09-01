-- Optional post-sale content. This is not product listing media and does not
-- alter the inventory lifecycle; it is a private workspace archive for later use.
create table public.sale_moments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  storage_path text not null,
  moment_type text not null default 'item' check (moment_type in ('customer', 'item', 'package')),
  created_at timestamptz not null default now(),
  unique (owner_id, storage_path)
);

create index sale_moments_sale_id_idx on public.sale_moments(sale_id, created_at desc);
alter table public.sale_moments enable row level security;
revoke all on table public.sale_moments from public, anon;
grant select, insert, delete on table public.sale_moments to authenticated;

create policy "sale_moments_team_read" on public.sale_moments for select to authenticated
using (owner_id in (select private.accessible_business_owner_ids()));
create policy "sale_moments_team_insert" on public.sale_moments for insert to authenticated
with check (
  owner_id in (select private.accessible_business_owner_ids())
  and exists (select 1 from public.sales sale where sale.id = sale_id and sale.owner_id = sale_moments.owner_id)
);
create policy "sale_moments_team_delete" on public.sale_moments for delete to authenticated
using (owner_id in (select private.accessible_business_owner_ids()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sale-moments', 'sale-moments', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

create policy "sale_moments_storage_select_team" on storage.objects for select to authenticated
using (bucket_id = 'sale-moments' and (storage.foldername(name))[1] in (select id::text from private.accessible_business_owner_ids() as id));
create policy "sale_moments_storage_insert_team" on storage.objects for insert to authenticated
with check (bucket_id = 'sale-moments' and (storage.foldername(name))[1] in (select id::text from private.accessible_business_owner_ids() as id));
create policy "sale_moments_storage_delete_team" on storage.objects for delete to authenticated
using (bucket_id = 'sale-moments' and (storage.foldername(name))[1] in (select id::text from private.accessible_business_owner_ids() as id));

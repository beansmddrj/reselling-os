-- First-class business tenant foundation.
-- Legacy workspaces keep their owner UUID as their business UUID so existing
-- records and Storage paths remain valid while all new code can use business_id.

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index businesses_owner_id_initial_workspace_idx
  on public.businesses(owner_id)
  where id = owner_id;

insert into public.businesses (id, owner_id, name)
select profile.id, profile.id, coalesce(nullif(trim(profile.display_name), ''), 'My resale business')
from public.profiles profile
on conflict (id) do nothing;

create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

alter table public.business_members add column business_id uuid references public.businesses(id) on delete cascade;
update public.business_members set business_id = business_owner_id where business_id is null;
alter table public.business_members alter column business_id set not null;
alter table public.business_members drop constraint business_members_pkey;
alter table public.business_members add primary key (business_id, user_id);
drop index if exists public.business_members_one_joined_business_idx;
create index business_members_user_business_idx on public.business_members(user_id, business_id);
create index business_members_owner_business_idx on public.business_members(business_owner_id, business_id);

alter table public.business_invites add column business_id uuid references public.businesses(id) on delete cascade;
update public.business_invites set business_id = business_owner_id where business_id is null;
alter table public.business_invites alter column business_id set not null;
drop index if exists public.business_invites_pending_email_idx;
create unique index business_invites_pending_business_email_idx
  on public.business_invites(business_id, lower(email))
  where accepted_at is null;
create index business_invites_business_id_idx on public.business_invites(business_id) where accepted_at is null;

alter table public.products add column business_id uuid references public.businesses(id) on delete restrict;
alter table public.inventory_units add column business_id uuid references public.businesses(id) on delete restrict;
alter table public.listings add column business_id uuid references public.businesses(id) on delete restrict;
alter table public.sales add column business_id uuid references public.businesses(id) on delete restrict;
alter table public.business_events add column business_id uuid references public.businesses(id) on delete restrict;
alter table public.intake_drafts add column business_id uuid references public.businesses(id) on delete restrict;
alter table public.product_photos add column business_id uuid references public.businesses(id) on delete restrict;
alter table public.sale_moments add column business_id uuid references public.businesses(id) on delete restrict;
alter table public.business_expenses add column business_id uuid references public.businesses(id) on delete restrict;
alter table public.inbound_shipments add column business_id uuid references public.businesses(id) on delete restrict;
alter table public.inbound_shipment_financials add column business_id uuid references public.businesses(id) on delete restrict;
alter table public.inbound_packages add column business_id uuid references public.businesses(id) on delete restrict;
alter table public.inbound_receipts add column business_id uuid references public.businesses(id) on delete restrict;

update public.products set business_id = owner_id where business_id is null;
update public.inventory_units set business_id = owner_id where business_id is null;
update public.listings set business_id = owner_id where business_id is null;
update public.sales set business_id = owner_id where business_id is null;
update public.business_events set business_id = owner_id where business_id is null;
update public.intake_drafts set business_id = owner_id where business_id is null;
update public.product_photos set business_id = owner_id where business_id is null;
update public.sale_moments set business_id = owner_id where business_id is null;
update public.business_expenses set business_id = owner_id where business_id is null;
update public.inbound_shipments set business_id = owner_id where business_id is null;
update public.inbound_shipment_financials set business_id = owner_id where business_id is null;
update public.inbound_packages set business_id = owner_id where business_id is null;
update public.inbound_receipts set business_id = owner_id where business_id is null;

alter table public.products alter column business_id set not null;
alter table public.inventory_units alter column business_id set not null;
alter table public.listings alter column business_id set not null;
alter table public.sales alter column business_id set not null;
alter table public.business_events alter column business_id set not null;
alter table public.intake_drafts alter column business_id set not null;
alter table public.product_photos alter column business_id set not null;
alter table public.sale_moments alter column business_id set not null;
alter table public.business_expenses alter column business_id set not null;
alter table public.inbound_shipments alter column business_id set not null;
alter table public.inbound_shipment_financials alter column business_id set not null;
alter table public.inbound_packages alter column business_id set not null;
alter table public.inbound_receipts alter column business_id set not null;

create index products_business_id_idx on public.products(business_id);
create index inventory_units_business_id_idx on public.inventory_units(business_id);
create index listings_business_id_idx on public.listings(business_id);
create index sales_business_id_idx on public.sales(business_id, sold_at desc);
create index business_events_business_id_idx on public.business_events(business_id, occurred_at desc);
create index intake_drafts_business_id_idx on public.intake_drafts(business_id);
create index product_photos_business_id_idx on public.product_photos(business_id);
create index sale_moments_business_id_idx on public.sale_moments(business_id);
create index business_expenses_business_id_idx on public.business_expenses(business_id, occurred_on desc);
create index inbound_shipments_business_id_idx on public.inbound_shipments(business_id, status, created_at desc);
create index inbound_packages_business_id_idx on public.inbound_packages(business_id);
create index inbound_receipts_business_id_idx on public.inbound_receipts(business_id);

alter table public.businesses enable row level security;
revoke all on table public.businesses from public, anon;
grant select, update on table public.businesses to authenticated;

create or replace function private.accessible_business_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select business_id
  from public.business_members
  where user_id = (select auth.uid())
$$;

revoke execute on function private.accessible_business_ids() from public, anon;
grant execute on function private.accessible_business_ids() to authenticated;

create policy "businesses_read_member" on public.businesses for select to authenticated
using (id in (select private.accessible_business_ids()));

create policy "businesses_update_owner" on public.businesses for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy "business_members_read_team" on public.business_members;
create policy "business_members_read_business" on public.business_members for select to authenticated
using (business_id in (select private.accessible_business_ids()));

drop policy "business_members_accept_invite" on public.business_members;
revoke insert on table public.business_members from authenticated;

drop policy "business_invites_owner_read" on public.business_invites;
create policy "business_invites_owner_read" on public.business_invites for select to authenticated
using (business_id in (select private.accessible_business_ids()) and business_owner_id = (select auth.uid()));

drop policy "business_invites_owner_insert" on public.business_invites;
create policy "business_invites_owner_insert" on public.business_invites for insert to authenticated
with check (
  business_owner_id = (select auth.uid())
  and invited_by = (select auth.uid())
  and business_id in (select private.accessible_business_ids())
);

drop policy "business_invites_owner_delete" on public.business_invites;
create policy "business_invites_owner_delete" on public.business_invites for delete to authenticated
using (business_id in (select private.accessible_business_ids()) and business_owner_id = (select auth.uid()));

drop policy "business_invites_recipient_accept" on public.business_invites;
revoke update on table public.business_invites from authenticated;

create or replace function public.accept_business_invite(invite_id uuid)
returns void
language plpgsql
security definer
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
  insert into public.business_members (business_id, business_owner_id, user_id, role)
  values (invitation.business_id, invitation.business_owner_id, auth.uid(), 'member');
  update public.business_invites set accepted_at = now() where id = invitation.id;
end;
$$;

revoke execute on function public.accept_business_invite(uuid) from public, anon;
grant execute on function public.accept_business_invite(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email));
  insert into public.businesses (id, owner_id, name)
  values (new.id, new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'My resale business'));
  insert into public.business_members (business_id, business_owner_id, user_id, role)
  values (new.id, new.id, new.id, 'owner');
  return new;
end;
$$;

-- The next platform migration switches every query and RLS policy to business_id.
-- Keeping owner_id during this rollout preserves the live reference workspace
-- while the application transitions its reads, writes, and Storage paths safely.

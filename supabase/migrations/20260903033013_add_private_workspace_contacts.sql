-- Optional personal contact data. Keep this separate from team-readable
-- profiles and do not treat account access as marketing consent.
create table public.workspace_contacts (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  phone_e164 text not null check (phone_e164 ~ '^\\+[1-9][0-9]{6,14}$'),
  marketing_opt_in boolean not null default false,
  marketing_consent_at timestamptz,
  marketing_opted_out_at timestamptz,
  marketing_consent_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, user_id),
  check (
    (marketing_opt_in and marketing_consent_at is not null and marketing_opted_out_at is null and marketing_consent_version is not null)
    or not marketing_opt_in
  )
);

create index workspace_contacts_business_opt_in_idx
  on public.workspace_contacts(business_id, marketing_opt_in);

create trigger workspace_contacts_set_updated_at
before update on public.workspace_contacts
for each row execute function public.set_updated_at();

alter table public.workspace_contacts enable row level security;
revoke all on table public.workspace_contacts from public, anon;
grant select, insert, update, delete on table public.workspace_contacts to authenticated;

create policy "workspace_contacts_owner_or_self_read"
on public.workspace_contacts for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.businesses business
    where business.id = workspace_contacts.business_id
      and business.owner_id = (select auth.uid())
  )
);

create policy "workspace_contacts_self_insert"
on public.workspace_contacts for insert to authenticated
with check (
  user_id = (select auth.uid())
  and business_id in (select private.accessible_business_ids())
);

create policy "workspace_contacts_self_update"
on public.workspace_contacts for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and business_id in (select private.accessible_business_ids())
);

create policy "workspace_contacts_self_delete"
on public.workspace_contacts for delete to authenticated
using (user_id = (select auth.uid()));

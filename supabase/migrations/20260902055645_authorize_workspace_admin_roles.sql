-- Admins manage operations, never owner-only finances or ownership itself.
grant update on table public.business_members to authenticated;

create policy "business_members_owner_update_role" on public.business_members for update to authenticated
using (
  business_owner_id = (select auth.uid())
  and user_id <> business_owner_id
  and business_id in (select private.accessible_business_ids())
)
with check (
  business_owner_id = (select auth.uid())
  and user_id <> business_owner_id
  and role in ('member', 'admin')
  and business_id in (select private.accessible_business_ids())
);

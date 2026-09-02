-- Keep invitation acceptance inside normal RLS rather than a callable
-- SECURITY DEFINER endpoint. Only accepted_at is writable by invitees.

create policy "business_members_accept_invite" on public.business_members for insert to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'member'
  and exists (
    select 1
    from public.business_invites invitation
    where invitation.business_id = business_members.business_id
      and invitation.business_owner_id = business_members.business_owner_id
      and invitation.accepted_at is null
      and lower(invitation.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
);

grant insert on table public.business_members to authenticated;

create policy "business_invites_recipient_accept" on public.business_invites for update to authenticated
using (accepted_at is null and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), '')))
with check (accepted_at is not null and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), '')));

grant update (accepted_at) on table public.business_invites to authenticated;

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
  insert into public.business_members (business_id, business_owner_id, user_id, role)
  values (invitation.business_id, invitation.business_owner_id, auth.uid(), 'member');
  update public.business_invites set accepted_at = now() where id = invitation.id;
end;
$$;

revoke execute on function public.accept_business_invite(uuid) from public, anon;
grant execute on function public.accept_business_invite(uuid) to authenticated;

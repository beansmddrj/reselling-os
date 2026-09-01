-- UPDATE also requires the resulting row to remain visible through SELECT RLS.
-- Keep accepted invitations visible only to the verified email recipient; the app
-- still filters incoming invitations to accepted_at is null.
drop policy "business_invites_recipient_read" on public.business_invites;
create policy "business_invites_recipient_read" on public.business_invites for select to authenticated
using (lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), '')));

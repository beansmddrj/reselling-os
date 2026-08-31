-- Explicit Data API grants for projects created with automatic exposure disabled.
-- RLS remains the authorization boundary for every granted table.

grant usage on schema public to authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.products to authenticated;
grant select, insert, update, delete on table public.inventory_units to authenticated;
grant select, insert, update, delete on table public.listings to authenticated;
grant select, insert, update, delete on table public.sales to authenticated;
grant select, insert on table public.business_events to authenticated;
grant select, insert, update, delete on table public.intake_drafts to authenticated;
grant select, insert, update, delete on table public.product_photos to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.finalize_intake_draft(uuid) from public, anon;
grant execute on function public.finalize_intake_draft(uuid) to authenticated;

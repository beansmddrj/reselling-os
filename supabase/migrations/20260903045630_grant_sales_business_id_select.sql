-- Sold Moments are available to every member of the same workspace. The
-- privacy migration intentionally narrowed the sales columns exposed to the
-- client, but omitted business_id, which the page must use to enforce that
-- workspace boundary under RLS.
grant select (business_id) on table public.sales to authenticated;

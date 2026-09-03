-- Lightweight operational error monitoring. Reports intentionally exclude
-- stack traces, form values, item details, and financial data.
create table public.workspace_error_reports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (char_length(source) between 1 and 120),
  message text not null check (char_length(message) between 1 and 1000),
  digest text check (digest is null or char_length(digest) <= 120),
  occurred_at timestamptz not null default now()
);

create index workspace_error_reports_business_occurred_idx
  on public.workspace_error_reports(business_id, occurred_at desc);

alter table public.workspace_error_reports enable row level security;
revoke all on table public.workspace_error_reports from public, anon;
grant select, insert on table public.workspace_error_reports to authenticated;

create policy "workspace_error_reports_admin_read"
on public.workspace_error_reports for select to authenticated
using (
  exists (
    select 1 from public.business_members member
    where member.business_id = workspace_error_reports.business_id
      and member.user_id = (select auth.uid())
      and member.role in ('owner', 'admin')
  )
);

create policy "workspace_error_reports_member_insert"
on public.workspace_error_reports for insert to authenticated
with check (
  reporter_id = (select auth.uid())
  and business_id in (select private.accessible_business_ids())
);

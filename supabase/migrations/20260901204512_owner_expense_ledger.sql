create table public.business_expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('supplies', 'travel', 'subscription', 'shipping', 'taxes', 'personal_draw', 'historical_adjustment', 'other')),
  amount_cents bigint not null check (amount_cents > 0),
  description text not null check (char_length(description) between 1 and 280),
  occurred_on date not null,
  created_at timestamptz not null default now()
);

create index business_expenses_owner_date_idx on public.business_expenses(owner_id, occurred_on desc);
alter table public.business_expenses enable row level security;
grant select, insert, delete on table public.business_expenses to authenticated;

create policy "business_expenses_owner_only" on public.business_expenses for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create or replace function private.log_expense_activity()
returns trigger language plpgsql set search_path = '' as $$
begin
  insert into public.business_events (owner_id, event_type, entity_type, entity_id, metadata)
  values (new.owner_id, 'expense_recorded', 'expense', new.id, jsonb_build_object('actor_id', auth.uid()));
  return new;
end; $$;

create trigger business_expenses_log_activity after insert on public.business_expenses
for each row execute function private.log_expense_activity();

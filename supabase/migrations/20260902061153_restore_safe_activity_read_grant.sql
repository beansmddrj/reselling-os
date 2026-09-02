-- The activity feed filters by the Business tenant. Keep raw event metadata
-- private while granting only the fields the feed renders.
grant select (id, business_id, owner_id, event_type, entity_type, entity_id, actor_id, occurred_at)
on table public.business_events to authenticated;

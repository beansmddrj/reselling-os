-- Introduce the role in its own transaction. PostgreSQL intentionally does
-- not allow a newly added enum value inside a policy in this same migration.
alter type public.business_role add value if not exists 'admin';

begin;
select plan(6);

-- Two unrelated businesses. auth.users inserts run the existing new-user
-- trigger, which creates each profile, Business, and owner membership.
insert into auth.users (id, email)
values
  ('10000000-0000-0000-0000-000000000001', 'tenant-a@example.com'),
  ('20000000-0000-0000-0000-000000000002', 'tenant-b@example.com');

insert into public.products (id, owner_id, business_id, name)
values
  ('10000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Tenant A product'),
  ('20000000-0000-0000-0000-000000000202', '20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Tenant B product');

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';

select results_eq(
  $$select name from public.products order by name$$,
  array['Tenant A product'],
  'Business A reads only its own inventory'
);

select is_empty(
  $$select id from public.products where id = '20000000-0000-0000-0000-000000000202'$$,
  'Business A cannot discover Business B inventory'
);

select is_empty(
  $$update public.products set name = 'stolen' where id = '20000000-0000-0000-0000-000000000202' returning id$$,
  'Business A cannot update Business B inventory'
);

select is_empty(
  $$delete from public.products where id = '20000000-0000-0000-0000-000000000202' returning id$$,
  'Business A cannot delete Business B inventory'
);

set local request.jwt.claim.sub = '20000000-0000-0000-0000-000000000002';

select results_eq(
  $$select name from public.products order by name$$,
  array['Tenant B product'],
  'Business B reads only its own inventory'
);

select results_eq(
  $$select name from public.products where id = '20000000-0000-0000-0000-000000000202'$$,
  array['Tenant B product'],
  'Denied cross-business writes leave the other business intact'
);

select * from finish();
rollback;

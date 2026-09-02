-- Every operational RPC must run as the caller. Business RLS policies then
-- enforce the same tenant boundary for mutations as they do for direct reads.
-- This makes the authorization model explicit and guards against a future
-- function replacement accidentally changing execution privileges.
alter function public.finalize_intake_draft(uuid) security invoker;
alter function public.update_inventory_item(uuid, text, text, text, text, text, text, text, boolean, bigint, text, text, text, bigint) security invoker;
alter function public.delete_inventory_item(uuid) security invoker;
alter function public.transition_inventory_item(uuid, public.inventory_status, text) security invoker;
alter function public.record_inventory_sale(uuid, public.marketplace_platform, bigint, bigint, bigint, bigint, bigint, timestamptz) security invoker;
alter function public.set_product_restock_status(uuid, text) security invoker;
alter function public.set_inventory_product_archived(uuid, boolean) security invoker;
alter function public.adjust_repeatable_inventory_quantity(uuid, smallint, text, text) security invoker;
alter function public.set_repeatable_inventory_unit_size(uuid, text) security invoker;

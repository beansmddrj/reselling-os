alter table public.workspace_contacts
  drop constraint workspace_contacts_phone_e164_check;

alter table public.workspace_contacts
  add constraint workspace_contacts_phone_e164_check
  check (phone_e164 ~ '^[+][1-9][0-9]{6,14}$');

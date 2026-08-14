alter table public.profiles add column account_id text;

update public.profiles
set account_id = 'user_' || left(replace(user_id::text, '-', ''), 12)
where account_id is null;

alter table public.profiles
  alter column account_id set not null,
  add constraint profiles_account_id_format check (account_id ~ '^[a-z][a-z0-9_]{2,23}$'),
  add constraint profiles_account_id_unique unique (account_id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_account_id text;
begin
  requested_account_id := lower(trim(coalesce(new.raw_user_meta_data ->> 'account_id', '')));
  if requested_account_id !~ '^[a-z][a-z0-9_]{2,23}$' then
    requested_account_id := 'user_' || left(replace(new.id::text, '-', ''), 12);
  end if;

  insert into public.profiles (user_id, account_id, display_name)
  values (
    new.id,
    requested_account_id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)), 80)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create index profiles_account_id_lookup_idx on public.profiles(account_id, status);

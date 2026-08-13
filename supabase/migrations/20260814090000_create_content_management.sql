create type public.entry_status as enum ('draft', 'published', 'archived');

create table public.entries (
  id text primary key,
  thai text not null,
  pronunciation text not null default '',
  meaning text not null,
  category text not null,
  source text not null default '',
  status public.entry_status not null default 'published',
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.entry_versions (
  entry_id text not null references public.entries(id) on delete cascade,
  version integer not null check (version > 0),
  thai text not null,
  pronunciation text not null default '',
  meaning text not null,
  category text not null,
  source text not null default '',
  status public.entry_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  change_reason text not null default '',
  primary key (entry_id, version)
);

create index entries_status_updated_idx on public.entries(status, updated_at desc);
create index entries_category_idx on public.entries(category);
alter table public.entries enable row level security;
alter table public.entry_versions enable row level security;

create policy "Anyone can read published entries" on public.entries for select
  using (status = 'published');
create policy "Editors can read all entries" on public.entries for select
  using (public.is_active_user() and public.current_app_role() in ('content_editor', 'admin', 'super_admin'));
create policy "Editors can insert entries" on public.entries for insert
  with check (public.is_active_user() and public.current_app_role() in ('content_editor', 'admin', 'super_admin'));
create policy "Editors can update entries" on public.entries for update
  using (public.is_active_user() and public.current_app_role() in ('content_editor', 'admin', 'super_admin'))
  with check (public.is_active_user() and public.current_app_role() in ('content_editor', 'admin', 'super_admin'));

create policy "Editors can read entry versions" on public.entry_versions for select
  using (public.is_active_user() and public.current_app_role() in ('content_editor', 'admin', 'super_admin'));
create policy "Editors can insert entry versions" on public.entry_versions for insert
  with check (public.is_active_user() and public.current_app_role() in ('content_editor', 'admin', 'super_admin'));

create trigger entries_touch_updated_at before update on public.entries
for each row execute function public.touch_updated_at();

create or replace function public.snapshot_entry_version()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.entry_versions(entry_id, version, thai, pronunciation, meaning, category, source, status, changed_by, change_reason)
  values (new.id, new.version, new.thai, new.pronunciation, new.meaning, new.category, new.source, new.status, new.updated_by, '');
  return new;
end;
$$;
create trigger entries_snapshot_version after insert or update on public.entries
for each row execute function public.snapshot_entry_version();

revoke all on public.entries, public.entry_versions from anon, authenticated;
grant select on public.entries to anon, authenticated;
grant select, insert, update on public.entries to authenticated;
grant select, insert on public.entry_versions to authenticated;

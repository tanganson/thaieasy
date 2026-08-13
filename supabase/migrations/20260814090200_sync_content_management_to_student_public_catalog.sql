-- The first content-management migration uses `entries` as the admin write
-- surface. Keep the student-facing public catalog in sync without a second
-- manual import path.

create or replace function public.sync_entry_to_public_catalog()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.public_entries (
    id, thai, normalized_thai, meaning, pronunciation, category, source,
    status, version, sort_order, created_at, updated_at, published_at
  ) values (
    new.id,
    new.thai,
    lower(regexp_replace(new.thai, '\s+', '', 'g')),
    new.meaning,
    new.pronunciation,
    new.category,
    new.source,
    case new.status::text when 'draft' then 'draft'::public.public_entry_status
      when 'archived' then 'archived'::public.public_entry_status
      else 'published'::public.public_entry_status end,
    new.version,
    0,
    new.created_at,
    new.updated_at,
    case when new.status::text = 'published' then coalesce(new.updated_at, now()) else null end
  )
  on conflict (id) do update set
    thai = excluded.thai,
    normalized_thai = excluded.normalized_thai,
    meaning = excluded.meaning,
    pronunciation = excluded.pronunciation,
    category = excluded.category,
    source = excluded.source,
    status = excluded.status,
    version = excluded.version,
    updated_at = excluded.updated_at,
    published_at = excluded.published_at;
  return new;
end;
$$;

create trigger entries_sync_public_catalog
after insert or update on public.entries
for each row execute function public.sync_entry_to_public_catalog();

insert into public.public_entries (
  id, thai, normalized_thai, meaning, pronunciation, category, source,
  status, version, sort_order, created_at, updated_at, published_at
)
select
  e.id,
  e.thai,
  lower(regexp_replace(e.thai, '\s+', '', 'g')),
  e.meaning,
  e.pronunciation,
  e.category,
  e.source,
  case e.status::text when 'draft' then 'draft'::public.public_entry_status
    when 'archived' then 'archived'::public.public_entry_status
    else 'published'::public.public_entry_status end,
  e.version,
  0,
  e.created_at,
  e.updated_at,
  case when e.status::text = 'published' then coalesce(e.updated_at, now()) else null end
from public.entries e
on conflict (id) do update set
  thai = excluded.thai,
  normalized_thai = excluded.normalized_thai,
  meaning = excluded.meaning,
  pronunciation = excluded.pronunciation,
  category = excluded.category,
  source = excluded.source,
  status = excluded.status,
  version = excluded.version,
  updated_at = excluded.updated_at,
  published_at = excluded.published_at;

insert into public.public_entry_versions (entry_id, version, snapshot, change_reason)
select p.id, p.version, jsonb_build_object(
  'id', p.id, 'thai', p.thai, 'meaning', p.meaning,
  'pronunciation', p.pronunciation, 'category', p.category, 'source', p.source,
  'status', p.status
), 'initial public catalog mirror'
from public.public_entries p
on conflict (entry_id, version) do nothing;

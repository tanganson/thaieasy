-- Public vocabulary is shared content. Student learning tables are the private
-- per-user scope, review history and imports; they are intentionally not
-- separate Supabase projects.

create type public.public_entry_status as enum ('draft', 'reviewed', 'published', 'archived');

create table public.public_entries (
  id text primary key,
  thai text not null,
  normalized_thai text not null,
  meaning text not null,
  pronunciation text not null default '',
  category text not null,
  source text not null default '',
  part_of_speech text,
  difficulty_shape smallint,
  difficulty_pronunciation smallint,
  difficulty_frequency smallint,
  difficulty_syntax smallint,
  difficulty_task smallint,
  status public.public_entry_status not null default 'published',
  version integer not null default 1,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint public_entries_thai_length check (char_length(thai) between 1 and 500),
  constraint public_entries_meaning_length check (char_length(meaning) between 1 and 1000),
  constraint public_entries_category_length check (char_length(category) between 1 and 80),
  constraint public_entries_difficulty_range check (
    (difficulty_shape is null or difficulty_shape between 1 and 5) and
    (difficulty_pronunciation is null or difficulty_pronunciation between 1 and 5) and
    (difficulty_frequency is null or difficulty_frequency between 1 and 5) and
    (difficulty_syntax is null or difficulty_syntax between 1 and 5) and
    (difficulty_task is null or difficulty_task between 1 and 5)
  )
);

create table public.public_entry_versions (
  id bigint generated always as identity primary key,
  entry_id text not null references public.public_entries(id) on delete restrict,
  version integer not null,
  snapshot jsonb not null,
  changed_by uuid references auth.users(id) on delete set null,
  change_reason text not null default '',
  created_at timestamptz not null default now(),
  unique (entry_id, version)
);

create table public.student_custom_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  meaning text not null,
  thai text not null,
  pronunciation text not null default '',
  category text not null,
  source text not null default '個人新增',
  source_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint student_custom_entries_meaning check (char_length(meaning) between 1 and 1000),
  constraint student_custom_entries_thai check (char_length(thai) between 1 and 500),
  constraint student_custom_entries_category check (char_length(category) between 1 and 80)
);

create table public.student_learning_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  public_entry_id text references public.public_entries(id) on delete restrict,
  custom_entry_id text,
  added_via text not null default 'manual',
  created_at timestamptz not null default now(),
  constraint student_learning_entries_one_source check ((public_entry_id is not null) <> (custom_entry_id is not null)),
  constraint student_learning_entries_custom_owner foreign key (custom_entry_id, user_id)
    references public.student_custom_entries(id, user_id) on delete cascade
);

create unique index student_learning_public_unique
  on public.student_learning_entries(user_id, public_entry_id)
  where public_entry_id is not null;
create unique index student_learning_custom_unique
  on public.student_learning_entries(user_id, custom_entry_id)
  where custom_entry_id is not null;

create table public.user_entry_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  public_entry_id text references public.public_entries(id) on delete restrict,
  custom_entry_id text,
  rating text,
  due_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_count integer not null default 0,
  correct_streak integer not null default 0,
  weakness_score numeric(6,2) not null default 0,
  algorithm_version text not null default 'basic-v1',
  updated_at timestamptz not null default now(),
  constraint user_entry_progress_one_source check ((public_entry_id is not null) <> (custom_entry_id is not null)),
  constraint user_entry_progress_custom_owner foreign key (custom_entry_id, user_id)
    references public.student_custom_entries(id, user_id) on delete cascade,
  constraint user_entry_progress_rating check (rating is null or rating in ('again', 'hard', 'good')),
  constraint user_entry_progress_counts check (review_count >= 0 and correct_streak >= 0)
);

create unique index user_entry_progress_public_unique
  on public.user_entry_progress(user_id, public_entry_id)
  where public_entry_id is not null;
create unique index user_entry_progress_custom_unique
  on public.user_entry_progress(user_id, custom_entry_id)
  where custom_entry_id is not null;

create table public.review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_event_id text not null,
  public_entry_id text references public.public_entries(id) on delete restrict,
  custom_entry_id text,
  entry_version integer,
  exercise_type text not null default 'quick_review',
  target_skill text,
  result text not null,
  response_ms integer,
  answered_at timestamptz not null default now(),
  question_snapshot jsonb,
  constraint review_events_one_source check ((public_entry_id is not null) <> (custom_entry_id is not null)),
  constraint review_events_custom_owner foreign key (custom_entry_id, user_id)
    references public.student_custom_entries(id, user_id) on delete cascade,
  constraint review_events_result check (result in ('again', 'hard', 'good', 'correct', 'incorrect')),
  constraint review_events_response_ms check (response_ms is null or response_ms >= 0),
  unique (user_id, client_event_id)
);

create table public.note_import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  storage_path text,
  status text not null default 'queued',
  error_message text,
  candidate_count integer not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  constraint note_import_jobs_status check (status in ('queued', 'extracting', 'review', 'completed', 'failed', 'cancelled')),
  constraint note_import_jobs_file_name check (char_length(file_name) between 1 and 255)
);

create table public.note_import_candidates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.note_import_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  public_entry_id text references public.public_entries(id) on delete restrict,
  thai text not null,
  meaning text not null,
  pronunciation text not null default '',
  category text not null default '日常動作與工作',
  source_snippet text,
  source_page integer,
  confidence numeric(5,4),
  decision text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint note_import_candidates_decision check (decision in ('pending', 'accepted', 'edited', 'rejected')),
  constraint note_import_candidates_confidence check (confidence is null or confidence between 0 and 1),
  constraint note_import_candidates_owner check (user_id = auth.uid())
);

create index public_entries_search_idx on public.public_entries using gin (to_tsvector('simple', thai || ' ' || meaning || ' ' || pronunciation));
create index public_entries_category_idx on public.public_entries(category, sort_order);
create index student_learning_entries_user_idx on public.student_learning_entries(user_id, created_at desc);
create index user_entry_progress_due_idx on public.user_entry_progress(user_id, due_at);
create index review_events_user_time_idx on public.review_events(user_id, answered_at desc);
create index note_import_jobs_user_idx on public.note_import_jobs(user_id, created_at desc);
create index note_import_candidates_job_idx on public.note_import_candidates(job_id, decision);

create trigger public_entries_touch_updated_at
before update on public.public_entries
for each row execute function public.touch_updated_at();

create trigger student_custom_entries_touch_updated_at
before update on public.student_custom_entries
for each row execute function public.touch_updated_at();

create trigger user_entry_progress_touch_updated_at
before update on public.user_entry_progress
for each row execute function public.touch_updated_at();

alter table public.public_entries enable row level security;
alter table public.public_entry_versions enable row level security;
alter table public.student_custom_entries enable row level security;
alter table public.student_learning_entries enable row level security;
alter table public.user_entry_progress enable row level security;
alter table public.review_events enable row level security;
alter table public.note_import_jobs enable row level security;
alter table public.note_import_candidates enable row level security;

create policy "Anyone can read published public entries"
  on public.public_entries for select
  using (status = 'published');

create policy "Active users manage their custom entries"
  on public.student_custom_entries for all
  using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid() and public.is_active_user());

create policy "Active users manage their learning entries"
  on public.student_learning_entries for all
  using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid() and public.is_active_user());

create policy "Active users manage their entry progress"
  on public.user_entry_progress for all
  using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid() and public.is_active_user());

create policy "Active users manage their review events"
  on public.review_events for all
  using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid() and public.is_active_user());

create policy "Active users manage their note import jobs"
  on public.note_import_jobs for all
  using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid() and public.is_active_user());

create policy "Active users manage their note import candidates"
  on public.note_import_candidates for all
  using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid() and public.is_active_user());

revoke all on public.public_entry_versions from anon, authenticated;
revoke all on public.public_entries from anon, authenticated;
grant select on public.public_entries to anon, authenticated;
grant select, insert, update, delete on public.student_custom_entries to authenticated;
grant select, insert, update, delete on public.student_learning_entries to authenticated;
grant select, insert, update, delete on public.user_entry_progress to authenticated;
grant select, insert, update, delete on public.review_events to authenticated;
grant select, insert, update, delete on public.note_import_jobs to authenticated;
grant select, insert, update, delete on public.note_import_candidates to authenticated;

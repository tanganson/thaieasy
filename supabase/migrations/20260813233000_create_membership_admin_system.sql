create type public.app_role as enum (
  'student',
  'teacher',
  'content_editor',
  'support_admin',
  'admin',
  'super_admin'
);

create type public.account_status as enum ('active', 'suspended');
create type public.group_status as enum ('active', 'archived');
create type public.membership_status as enum ('active', 'removed');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role public.app_role not null default 'student',
  status public.account_status not null default 'active',
  timezone text not null default 'Asia/Hong_Kong',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) <= 80)
);

create table public.learning_groups (
  id uuid primary key default gen_random_uuid(),
  owner_teacher_id uuid not null references public.profiles(user_id) on delete restrict,
  name text not null,
  invite_code text not null unique,
  status public.group_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_groups_name_length check (char_length(name) between 1 and 80),
  constraint learning_groups_invite_code_format check (invite_code ~ '^[A-Z0-9]{8}$')
);

create table public.group_memberships (
  group_id uuid not null references public.learning_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  member_role text not null default 'student',
  status public.membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, user_id),
  constraint group_memberships_role check (member_role in ('student', 'assistant'))
);

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  reason text not null,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_audit_logs_reason_length check (char_length(reason) between 3 and 500)
);

create index profiles_role_status_idx on public.profiles(role, status);
create index learning_groups_owner_idx on public.learning_groups(owner_teacher_id, status);
create index group_memberships_user_idx on public.group_memberships(user_id, status);
create index admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);
create index admin_audit_logs_target_idx on public.admin_audit_logs(target_user_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger learning_groups_touch_updated_at
before update on public.learning_groups
for each row execute function public.touch_updated_at();

create trigger group_memberships_touch_updated_at
before update on public.group_memberships
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)), 80)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

insert into public.profiles (user_id, display_name)
select id, left(coalesce(raw_user_meta_data ->> 'display_name', split_part(coalesce(email, ''), '@', 1)), 80)
from auth.users
on conflict (user_id) do nothing;

create or replace function public.is_active_user(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where user_id = check_user_id and status = 'active'
  );
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles
  where user_id = auth.uid() and status = 'active';
$$;

create or replace function public.is_group_member(check_group_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_memberships
    where group_id = check_group_id
      and user_id = check_user_id
      and status = 'active'
  );
$$;

create or replace function public.owns_learning_group(check_group_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.learning_groups
    where id = check_group_id and owner_teacher_id = check_user_id
  );
$$;

alter table public.profiles enable row level security;
alter table public.learning_groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = user_id and public.is_active_user());

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id and public.is_active_user())
  with check (auth.uid() = user_id and public.is_active_user());

create policy "Teachers can read owned groups"
  on public.learning_groups for select
  using (owner_teacher_id = auth.uid() and public.is_active_user());

create policy "Members can read their groups"
  on public.learning_groups for select
  using (public.is_active_user() and public.is_group_member(id));

create policy "Users can read their own memberships"
  on public.group_memberships for select
  using (user_id = auth.uid() and public.is_active_user());

create policy "Teachers can read owned group memberships"
  on public.group_memberships for select
  using (public.is_active_user() and public.owns_learning_group(group_id));

drop policy if exists "Users can read their own learning state" on public.user_learning_states;
drop policy if exists "Users can insert their own learning state" on public.user_learning_states;
drop policy if exists "Users can update their own learning state" on public.user_learning_states;

create policy "Active users can read their own learning state"
  on public.user_learning_states for select
  using (auth.uid() = user_id and public.is_active_user());

create policy "Active users can insert their own learning state"
  on public.user_learning_states for insert
  with check (auth.uid() = user_id and public.is_active_user());

create policy "Active users can update their own learning state"
  on public.user_learning_states for update
  using (auth.uid() = user_id and public.is_active_user())
  with check (auth.uid() = user_id and public.is_active_user());

revoke all on public.admin_audit_logs from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, timezone) on public.profiles to authenticated;
grant select on public.learning_groups, public.group_memberships to authenticated;
grant execute on function public.is_active_user(uuid) to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.owns_learning_group(uuid, uuid) to authenticated;

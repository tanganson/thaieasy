create or replace function public.validate_learning_group_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles
    where user_id = new.owner_teacher_id
      and role = 'teacher'
      and status = 'active'
  ) then
    raise exception 'Learning group owner must be an active teacher';
  end if;
  return new;
end;
$$;

create trigger learning_groups_validate_owner
before insert or update of owner_teacher_id on public.learning_groups
for each row execute function public.validate_learning_group_owner();

create or replace function public.validate_group_member_role()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  profile_role public.app_role;
  profile_status public.account_status;
begin
  select role, status into profile_role, profile_status
  from public.profiles where user_id = new.user_id;

  if profile_status is distinct from 'active' then
    raise exception 'Group member must have an active account';
  end if;
  if new.member_role = 'student' and profile_role is distinct from 'student' then
    raise exception 'Student membership requires a student account';
  end if;
  if new.member_role = 'assistant' and profile_role not in ('teacher', 'content_editor') then
    raise exception 'Assistant membership requires a teacher or content editor account';
  end if;
  return new;
end;
$$;

create trigger group_memberships_validate_role
before insert or update of user_id, member_role, status on public.group_memberships
for each row
when (new.status = 'active')
execute function public.validate_group_member_role();

revoke all on function public.validate_learning_group_owner() from public, anon, authenticated;
revoke all on function public.validate_group_member_role() from public, anon, authenticated;

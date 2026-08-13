revoke all on function public.is_active_user(uuid) from public, anon;
revoke all on function public.current_app_role() from public, anon;
revoke all on function public.is_group_member(uuid, uuid) from public, anon;
revoke all on function public.owns_learning_group(uuid, uuid) from public, anon;

grant execute on function public.is_active_user(uuid) to authenticated, service_role;
grant execute on function public.current_app_role() to authenticated, service_role;
grant execute on function public.is_group_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.owns_learning_group(uuid, uuid) to authenticated, service_role;

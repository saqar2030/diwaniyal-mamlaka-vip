grant execute on function public.has_role(uuid, app_role) to anon;
grant execute on function public.is_family_member(uuid, uuid) to anon;
grant execute on function public.is_family_owner(uuid, uuid) to anon;
grant execute on function public.is_room_owner(uuid, uuid) to anon;
grant execute on function public.is_room_staff(uuid, uuid) to anon;
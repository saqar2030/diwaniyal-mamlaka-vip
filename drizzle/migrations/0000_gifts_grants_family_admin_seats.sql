GRANT SELECT ON public.gifts, public.coin_packages TO anon, authenticated;
GRANT ALL ON public.gifts, public.coin_packages TO service_role;

CREATE OR REPLACE FUNCTION public.is_family_staff(_family_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select public.is_family_owner(_family_id, _user_id) or exists (
    select 1 from public.family_members m where m.family_id=_family_id and m.user_id=_user_id
      and m.status='approved' and m.role in ('manager','moderator'))
$$;
CREATE OR REPLACE FUNCTION public.is_family_manager(_family_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select public.is_family_owner(_family_id, _user_id) or exists (
    select 1 from public.family_members m where m.family_id=_family_id and m.user_id=_user_id
      and m.status='approved' and m.role='manager')
$$;

CREATE POLICY "families update manager" ON public.families FOR UPDATE TO authenticated
  USING (public.is_family_manager(id, auth.uid())) WITH CHECK (public.is_family_manager(id, auth.uid()));
CREATE POLICY "family members update staff" ON public.family_members FOR UPDATE TO authenticated
  USING (public.is_family_staff(family_id, auth.uid())) WITH CHECK (true);
CREATE POLICY "family members delete staff" ON public.family_members FOR DELETE TO authenticated
  USING (public.is_family_staff(family_id, auth.uid()));

CREATE TABLE public.family_bans (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  banned_by uuid,
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.family_bans TO authenticated;
GRANT ALL ON public.family_bans TO service_role;
ALTER TABLE public.family_bans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family bans read" ON public.family_bans FOR SELECT TO authenticated USING (true);
CREATE POLICY "family bans insert staff" ON public.family_bans FOR INSERT TO authenticated
  WITH CHECK (public.is_family_staff(family_id, auth.uid()));
CREATE POLICY "family bans delete staff" ON public.family_bans FOR DELETE TO authenticated
  USING (public.is_family_staff(family_id, auth.uid()));

CREATE POLICY "seats update staff" ON public.room_seats FOR UPDATE TO authenticated
  USING (public.is_room_staff(room_id, auth.uid())) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_room_seat_count(_room uuid, _n int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _cur int;
begin
  if not (public.is_room_owner(_room, auth.uid()) or public.has_role(auth.uid(),'admin')) then raise exception 'غير مصرح'; end if;
  if _n < 2 or _n > 20 then raise exception 'عدد المقاعد بين 2 و 20'; end if;
  select coalesce(max(seat_index),0) into _cur from public.room_seats where room_id=_room;
  if _n > _cur then
    insert into public.room_seats (room_id, seat_index) select _room, g from generate_series(_cur+1, _n) g;
  else
    delete from public.room_seats where room_id=_room and seat_index > _n;
  end if;
  update public.rooms set seat_count=_n where id=_room;
end $$;
REVOKE EXECUTE ON FUNCTION public.set_room_seat_count(uuid,int) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_room_seat_count(uuid,int) TO authenticated;
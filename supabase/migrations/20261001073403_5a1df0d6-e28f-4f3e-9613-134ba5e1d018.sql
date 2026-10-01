-- XP automatic system
DROP POLICY IF EXISTS "own levels insert" ON public.user_levels;
DROP POLICY IF EXISTS "own levels update" ON public.user_levels;
REVOKE INSERT, UPDATE ON public.user_levels FROM authenticated;

ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS xp_points integer NOT NULL DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_kind text;

CREATE OR REPLACE FUNCTION public.add_user_xp(_user uuid, _pts integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _xp int; _lvl int;
begin
  if _user is null or _pts <= 0 then return; end if;
  insert into public.user_levels (user_id) values (_user) on conflict (user_id) do nothing;
  select xp_points + _pts, current_level into _xp, _lvl from public.user_levels where user_id = _user for update;
  while _xp >= _lvl * 100 loop _xp := _xp - _lvl * 100; _lvl := _lvl + 1; end loop;
  update public.user_levels set xp_points = _xp, current_level = _lvl, updated_at = now() where user_id = _user;
  update public.profiles set level = _lvl where id = _user and level <> _lvl;
end; $$;

CREATE OR REPLACE FUNCTION public.add_room_xp(_room uuid, _pts integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _xp int; _lvl int;
begin
  if _room is null or _pts <= 0 then return; end if;
  select xp_points + _pts, level into _xp, _lvl from public.rooms where id = _room for update;
  if _lvl is null then return; end if;
  while _xp >= _lvl * 200 loop _xp := _xp - _lvl * 200; _lvl := _lvl + 1; end loop;
  update public.rooms set xp_points = _xp, level = _lvl where id = _room;
end; $$;

CREATE OR REPLACE FUNCTION public.xp_on_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if tg_table_name = 'room_messages' then
    perform public.add_user_xp(new.user_id, 5); perform public.add_room_xp(new.room_id, 5);
  elsif tg_table_name = 'direct_messages' then perform public.add_user_xp(new.sender_id, 3);
  elsif tg_table_name = 'family_messages' then perform public.add_user_xp(new.user_id, 4);
  elsif tg_table_name = 'posts' then perform public.add_user_xp(new.user_id, 15);
  elsif tg_table_name = 'post_comments' then perform public.add_user_xp(new.user_id, 5);
  elsif tg_table_name = 'gift_events' then
    perform public.add_user_xp(new.sender_id, greatest(1, (new.amount / 2)::int));
    perform public.add_user_xp(new.receiver_id, greatest(1, (new.amount / 4)::int));
    perform public.add_room_xp(new.room_id, greatest(1, new.amount::int));
  end if;
  return new;
end; $$;

CREATE TRIGGER xp_room_messages AFTER INSERT ON public.room_messages FOR EACH ROW EXECUTE FUNCTION public.xp_on_activity();
CREATE TRIGGER xp_direct_messages AFTER INSERT ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.xp_on_activity();
CREATE TRIGGER xp_family_messages AFTER INSERT ON public.family_messages FOR EACH ROW EXECUTE FUNCTION public.xp_on_activity();
CREATE TRIGGER xp_posts AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.xp_on_activity();
CREATE TRIGGER xp_post_comments AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.xp_on_activity();
CREATE TRIGGER xp_gift_events AFTER INSERT ON public.gift_events FOR EACH ROW EXECUTE FUNCTION public.xp_on_activity();

REVOKE EXECUTE ON FUNCTION public.add_user_xp(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_room_xp(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.xp_on_activity() FROM PUBLIC, anon, authenticated;

INSERT INTO public.user_levels (user_id) SELECT id FROM public.profiles ON CONFLICT DO NOTHING;
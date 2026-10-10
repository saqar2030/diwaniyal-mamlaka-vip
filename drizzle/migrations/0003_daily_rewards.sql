create table public.daily_checkins (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  streak int not null,
  reward bigint not null,
  primary key (user_id, day)
);
grant select on public.daily_checkins to authenticated;
grant all on public.daily_checkins to service_role;
alter table public.daily_checkins enable row level security;
create policy "own checkins" on public.daily_checkins for select to authenticated using (auth.uid() = user_id);

create table public.activity_claims (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  tier int not null,
  primary key (user_id, day, tier)
);
grant select on public.activity_claims to authenticated;
grant all on public.activity_claims to service_role;
alter table public.activity_claims enable row level security;
create policy "own claims" on public.activity_claims for select to authenticated using (auth.uid() = user_id);

create or replace function public.riyadh_today() returns date language sql stable as $$ select (now() at time zone 'Asia/Riyadh')::date $$;

create or replace function public.claim_daily_checkin() returns jsonb
language plpgsql security definer set search_path = public as $$
declare _today date := public.riyadh_today(); _last public.daily_checkins; _streak int; _reward bigint;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.daily_checkins where user_id=auth.uid() and day=_today) then raise exception 'سجلت اليوم مسبقاً'; end if;
  select * into _last from public.daily_checkins where user_id=auth.uid() order by day desc limit 1;
  if _last.day = _today - 1 and _last.streak < 7 then _streak := _last.streak + 1; else _streak := 1; end if;
  _reward := (array[5,5,5,5,10,10,100])[_streak];
  insert into public.daily_checkins values (auth.uid(), _today, _streak, _reward);
  update public.profiles set coins = coins + _reward where id = auth.uid();
  insert into public.coin_transactions (user_id, amount, kind, note) values (auth.uid(), _reward, 'checkin', 'تسجيل يومي - اليوم ' || _streak);
  return jsonb_build_object('streak', _streak, 'reward', _reward);
end $$;

create or replace function public.my_daily_activity() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare _u uuid := auth.uid(); _start timestamptz := (public.riyadh_today()::timestamp at time zone 'Asia/Riyadh');
  _rm int; _dm int; _po int; _co int; _gi int; _ck int; _pts int;
begin
  if _u is null then return '{}'::jsonb; end if;
  select count(*) into _rm from public.room_messages where user_id=_u and created_at>=_start and kind <> 'entry';
  select count(*) into _dm from public.direct_messages where sender_id=_u and created_at>=_start;
  select count(*) into _po from public.posts where user_id=_u and created_at>=_start;
  select count(*) into _co from public.post_comments where user_id=_u and created_at>=_start;
  select count(*) into _gi from public.gift_events where sender_id=_u and created_at>=_start;
  select count(*) into _ck from public.daily_checkins where user_id=_u and day=public.riyadh_today();
  _pts := (case when _ck>0 then 10 else 0 end) + (case when _rm>=10 then 20 else 0 end) + (case when _dm>=5 then 10 else 0 end)
        + (case when _po>=1 then 20 else 0 end) + (case when _co>=3 then 15 else 0 end) + (case when _gi>=1 then 25 else 0 end);
  return jsonb_build_object('room_messages',_rm,'direct_messages',_dm,'posts',_po,'comments',_co,'gifts',_gi,'checkin',_ck,'points',_pts);
end $$;

create or replace function public.claim_activity_chest(_tier int) returns bigint
language plpgsql security definer set search_path = public as $$
declare _need int; _reward bigint; _pts int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if _tier not between 1 and 4 then raise exception 'غير صالح'; end if;
  _need := (array[20,40,70,100])[_tier]; _reward := (array[10,25,50,100])[_tier];
  _pts := (public.my_daily_activity()->>'points')::int;
  if _pts < _need then raise exception 'نشاطك غير كافٍ بعد'; end if;
  insert into public.activity_claims values (auth.uid(), public.riyadh_today(), _tier);
  update public.profiles set coins = coins + _reward where id = auth.uid();
  insert into public.coin_transactions (user_id, amount, kind, note) values (auth.uid(), _reward, 'chest', 'صندوق النشاط اليومي');
  return _reward;
exception when unique_violation then raise exception 'استلمت هذا الصندوق اليوم';
end $$;

revoke execute on function public.claim_daily_checkin() from anon;
revoke execute on function public.my_daily_activity() from anon;
revoke execute on function public.claim_activity_chest(int) from anon;
-- ROOMS
alter table public.rooms add column if not exists welcome_message text default '',
  add column if not exists banner_url text,
  add column if not exists banner_animated boolean not null default false,
  add column if not exists background_url text;

create type public.room_role as enum ('admin','moderator');

create table public.room_roles (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.room_role not null,
  created_at timestamptz not null default now(),
  unique (room_id, user_id, role)
);
grant select, insert, delete on public.room_roles to authenticated;
grant select on public.room_roles to anon;
grant all on public.room_roles to service_role;
alter table public.room_roles enable row level security;

create or replace function public.is_room_owner(_room_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rooms r where r.id = _room_id and r.owner_id = _user_id)
$$;
revoke all on function public.is_room_owner(uuid, uuid) from public, anon;
grant execute on function public.is_room_owner(uuid, uuid) to authenticated;

create or replace function public.is_room_staff(_room_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rooms r where r.id = _room_id and r.owner_id = _user_id)
      or exists (select 1 from public.room_roles rr where rr.room_id = _room_id and rr.user_id = _user_id)
$$;
revoke all on function public.is_room_staff(uuid, uuid) from public, anon;
grant execute on function public.is_room_staff(uuid, uuid) to authenticated;

create policy "room roles readable" on public.room_roles for select using (true);
create policy "room roles manage by owner or admin" on public.room_roles for insert to authenticated
  with check (public.is_room_owner(room_id, auth.uid()) or public.has_role(auth.uid(),'admin'));
create policy "room roles delete by owner or admin" on public.room_roles for delete to authenticated
  using (public.is_room_owner(room_id, auth.uid()) or public.has_role(auth.uid(),'admin'));

create table public.room_bans (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  banned_by uuid references auth.users(id) on delete set null,
  reason text default '',
  created_at timestamptz not null default now(),
  unique (room_id, user_id)
);
grant select, insert, delete on public.room_bans to authenticated;
grant select on public.room_bans to anon;
grant all on public.room_bans to service_role;
alter table public.room_bans enable row level security;
create policy "room bans readable" on public.room_bans for select using (true);
create policy "room bans insert staff" on public.room_bans for insert to authenticated
  with check (public.is_room_staff(room_id, auth.uid()) or public.has_role(auth.uid(),'admin'));
create policy "room bans delete staff" on public.room_bans for delete to authenticated
  using (public.is_room_staff(room_id, auth.uid()) or public.has_role(auth.uid(),'admin'));

-- FAMILIES / GROUPS
alter table public.families add column if not exists banner_animated boolean not null default false,
  add column if not exists is_private boolean not null default false,
  add column if not exists requires_approval boolean not null default false;

alter table public.family_members add column if not exists role text not null default 'member',
  add column if not exists status text not null default 'approved';

create or replace function public.is_family_owner(_family_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.families f where f.id = _family_id and f.owner_id = _user_id)
$$;
revoke all on function public.is_family_owner(uuid, uuid) from public, anon;
grant execute on function public.is_family_owner(uuid, uuid) to authenticated;

create or replace function public.is_family_member(_family_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.family_members m
    where m.family_id = _family_id and m.user_id = _user_id and m.status = 'approved')
$$;
revoke all on function public.is_family_member(uuid, uuid) from public, anon;
grant execute on function public.is_family_member(uuid, uuid) to authenticated;

create policy "family members update by owner" on public.family_members for update to authenticated
  using (public.is_family_owner(family_id, auth.uid()) or public.has_role(auth.uid(),'admin'))
  with check (true);
grant update on public.family_members to authenticated;

create table public.family_messages (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  kind text not null default 'text',
  media_url text,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.family_messages to authenticated;
grant all on public.family_messages to service_role;
alter table public.family_messages enable row level security;
create policy "family messages read members" on public.family_messages for select to authenticated
  using (public.is_family_member(family_id, auth.uid()) or public.has_role(auth.uid(),'admin'));
create policy "family messages insert members" on public.family_messages for insert to authenticated
  with check (auth.uid() = user_id and public.is_family_member(family_id, auth.uid()));
create policy "family messages delete own or owner" on public.family_messages for delete to authenticated
  using (auth.uid() = user_id or public.is_family_owner(family_id, auth.uid()) or public.has_role(auth.uid(),'admin'));

-- DIRECT MESSAGES media
alter table public.direct_messages add column if not exists kind text not null default 'text',
  add column if not exists media_url text;
alter table public.direct_messages alter column content set default '';

-- PROFILES presence / ban
alter table public.profiles add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists is_banned boolean not null default false;

-- POSTS moderation
alter table public.posts add column if not exists is_hidden boolean not null default false;
drop policy if exists "posts readable" on public.posts;
create policy "posts readable" on public.posts for select using (is_hidden = false or auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "posts update admin or own" on public.posts for update to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin')) with check (true);
grant update on public.posts to authenticated;

-- COIN PACKAGES + TRANSACTIONS
create table public.coin_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  coins bigint not null,
  price_sar numeric(10,2) not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.coin_packages to anon, authenticated;
grant all on public.coin_packages to service_role;
alter table public.coin_packages enable row level security;
create policy "coin packages readable" on public.coin_packages for select using (true);
create policy "coin packages admin manage" on public.coin_packages for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
grant insert, update, delete on public.coin_packages to authenticated;

create table public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount bigint not null,
  kind text not null default 'topup',
  note text default '',
  created_at timestamptz not null default now()
);
grant select on public.coin_transactions to authenticated;
grant all on public.coin_transactions to service_role;
alter table public.coin_transactions enable row level security;
create policy "coin tx own read" on public.coin_transactions for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

insert into public.coin_packages (name, coins, price_sar, sort_order) values
  ('باقة البداية', 1000, 19.00, 1),
  ('باقة الديوانية', 5000, 89.00, 2),
  ('باقة الملكية', 20000, 299.00, 3),
  ('باقة الأسطورة', 100000, 1299.00, 4);

create or replace function public.topup_coins(_package_id uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare _coins bigint; _new bigint;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select coins into _coins from public.coin_packages where id = _package_id and is_active;
  if _coins is null then raise exception 'باقة غير موجودة'; end if;
  update public.profiles set coins = coins + _coins where id = auth.uid() returning coins into _new;
  insert into public.coin_transactions (user_id, amount, kind, note) values (auth.uid(), _coins, 'topup', 'شحن باقة');
  return _new;
end; $$;
revoke all on function public.topup_coins(uuid) from public, anon;
grant execute on function public.topup_coins(uuid) to authenticated;

-- COUPLES (أفضل كبل)
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  points bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (user_a, user_b)
);
grant select on public.couples to anon, authenticated;
grant all on public.couples to service_role;
alter table public.couples enable row level security;
create policy "couples readable" on public.couples for select using (true);

create or replace function public.bump_couple() returns trigger
language plpgsql security definer set search_path = public as $$
declare _a uuid; _b uuid;
begin
  _a := least(new.sender_id, new.receiver_id);
  _b := greatest(new.sender_id, new.receiver_id);
  insert into public.couples (user_a, user_b, points) values (_a, _b, new.amount)
  on conflict (user_a, user_b) do update set points = public.couples.points + excluded.points;
  return new;
end; $$;
revoke all on function public.bump_couple() from public, anon, authenticated;
create trigger gift_events_couple after insert on public.gift_events
  for each row execute function public.bump_couple();

-- APP SETTINGS (super admin)
create table public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "settings admin read" on public.app_settings for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "settings admin write" on public.app_settings for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
grant select, insert, update, delete on public.app_settings to authenticated;

insert into public.app_settings (key, value) values
  ('super_admin', jsonb_build_object('pin', '1234')),
  ('leaderboard', jsonb_build_object('show_rooms', true, 'show_families', true, 'show_supporters', true, 'show_couples', true));

create or replace function public.verify_super_pin(_pin text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_settings s where s.key = 'super_admin' and s.value->>'pin' = _pin)
$$;
revoke all on function public.verify_super_pin(text) from public, anon;
grant execute on function public.verify_super_pin(text) to authenticated;

create or replace function public.set_super_pin(_old text, _new text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.verify_super_pin(_old) then raise exception 'الرقم السري الحالي غير صحيح'; end if;
  update public.app_settings set value = jsonb_set(value, '{pin}', to_jsonb(_new)), updated_at = now() where key = 'super_admin';
  return true;
end; $$;
revoke all on function public.set_super_pin(text, text) from public, anon;
grant execute on function public.set_super_pin(text, text) to authenticated;

create or replace function public.touch_presence() returns void
language sql security definer set search_path = public as $$
  update public.profiles set last_seen_at = now() where id = auth.uid()
$$;
revoke all on function public.touch_presence() from public, anon;
grant execute on function public.touch_presence() to authenticated;

alter publication supabase_realtime add table public.family_messages;
alter publication supabase_realtime add table public.room_roles;
alter publication supabase_realtime add table public.room_bans;
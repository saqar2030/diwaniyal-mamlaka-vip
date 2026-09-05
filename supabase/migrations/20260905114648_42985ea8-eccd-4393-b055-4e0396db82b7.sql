
-- ROLES
create type public.app_role as enum ('admin','moderator','user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_id text not null unique default (100000000 + floor(random()*899999999))::bigint::text,
  bio text default '',
  avatar_url text,
  age int,
  coins bigint not null default 1000,
  gifts_received bigint not null default 0,
  gifts_sent bigint not null default 0,
  level int not null default 1,
  name_color text default '#fbbf24',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.profiles to anon;
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by all" on public.profiles for select using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "roles readable" on public.user_roles for select to authenticated using (true);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated before update on public.profiles
for each row execute function public.update_updated_at_column();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', 'ضيف'));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ROOMS
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  cover_url text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  seat_count int not null default 8,
  is_locked boolean not null default false,
  room_pin text,
  created_at timestamptz not null default now()
);
grant select on public.rooms to anon;
grant select, insert, update, delete on public.rooms to authenticated;
grant all on public.rooms to service_role;
alter table public.rooms enable row level security;
create policy "rooms readable" on public.rooms for select using (true);
create policy "rooms insert own" on public.rooms for insert to authenticated with check (auth.uid() = owner_id);
create policy "rooms update owner or admin" on public.rooms for update to authenticated
  using (auth.uid() = owner_id or public.has_role(auth.uid(),'admin'));
create policy "rooms delete owner or admin" on public.rooms for delete to authenticated
  using (auth.uid() = owner_id or public.has_role(auth.uid(),'admin'));

create table public.room_seats (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  seat_index int not null,
  user_id uuid references auth.users(id) on delete cascade,
  is_muted boolean not null default false,
  is_locked boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (room_id, seat_index)
);
grant select on public.room_seats to anon;
grant select, insert, update, delete on public.room_seats to authenticated;
grant all on public.room_seats to service_role;
alter table public.room_seats enable row level security;
create policy "seats readable" on public.room_seats for select using (true);
create policy "seats insert" on public.room_seats for insert to authenticated with check (true);
create policy "seats update" on public.room_seats for update to authenticated using (
  user_id is null or user_id = auth.uid()
  or exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid())
  or public.has_role(auth.uid(),'admin')
);
create policy "seats delete" on public.room_seats for delete to authenticated using (
  user_id = auth.uid() or exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid())
);

create or replace function public.create_room_seats()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.room_seats (room_id, seat_index)
  select new.id, g from generate_series(1, new.seat_count) g;
  return new;
end; $$;
create trigger rooms_seed_seats after insert on public.rooms
for each row execute function public.create_room_seats();

create table public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  kind text not null default 'text',
  created_at timestamptz not null default now()
);
grant select on public.room_messages to anon;
grant select, insert, delete on public.room_messages to authenticated;
grant all on public.room_messages to service_role;
alter table public.room_messages enable row level security;
create policy "room messages readable" on public.room_messages for select using (true);
create policy "room messages insert own" on public.room_messages for insert to authenticated with check (auth.uid() = user_id);
create policy "room messages delete own or admin" on public.room_messages for delete to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

-- GIFTS
create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null,
  price bigint not null,
  sort_order int not null default 0
);
grant select on public.gifts to anon, authenticated;
grant all on public.gifts to service_role;
alter table public.gifts enable row level security;
create policy "gifts readable" on public.gifts for select using (true);

insert into public.gifts (name, emoji, price, sort_order) values
('وردة','🌹',10,1),
('قهوة','☕',50,2),
('تاج','👑',500,3),
('صقر','🦅',1000,4),
('سيارة','🚗',5000,5),
('قصر','🏰',20000,6),
('طائرة','✈️',50000,7),
('نجمة نجد','⭐',100000,8);

create table public.gift_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  gift_id uuid not null references public.gifts(id),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  amount bigint not null,
  created_at timestamptz not null default now()
);
grant select on public.gift_events to anon;
grant select on public.gift_events to authenticated;
grant all on public.gift_events to service_role;
alter table public.gift_events enable row level security;
create policy "gift events readable" on public.gift_events for select using (true);

create or replace function public.send_gift(_gift_id uuid, _receiver_id uuid, _room_id uuid)
returns public.gift_events language plpgsql security definer set search_path = public as $$
declare _price bigint; _balance bigint; _ev public.gift_events;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if auth.uid() = _receiver_id then raise exception 'لا يمكنك إرسال هدية لنفسك'; end if;
  select price into _price from public.gifts where id = _gift_id;
  if _price is null then raise exception 'هدية غير موجودة'; end if;
  select coins into _balance from public.profiles where id = auth.uid();
  if _balance < _price then raise exception 'رصيدك غير كافٍ'; end if;
  update public.profiles set coins = coins - _price, gifts_sent = gifts_sent + _price where id = auth.uid();
  update public.profiles set coins = coins + _price, gifts_received = gifts_received + _price where id = _receiver_id;
  insert into public.gift_events (room_id, gift_id, sender_id, receiver_id, amount)
  values (_room_id, _gift_id, auth.uid(), _receiver_id, _price) returning * into _ev;
  return _ev;
end; $$;
grant execute on function public.send_gift(uuid, uuid, uuid) to authenticated;

-- SOCIAL
create table public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);
grant select on public.follows to anon;
grant select, insert, delete on public.follows to authenticated;
grant all on public.follows to service_role;
alter table public.follows enable row level security;
create policy "follows readable" on public.follows for select using (true);
create policy "follow own" on public.follows for insert to authenticated with check (auth.uid() = follower_id);
create policy "unfollow own" on public.follows for delete to authenticated using (auth.uid() = follower_id);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  image_url text,
  created_at timestamptz not null default now()
);
grant select on public.posts to anon;
grant select, insert, update, delete on public.posts to authenticated;
grant all on public.posts to service_role;
alter table public.posts enable row level security;
create policy "posts readable" on public.posts for select using (true);
create policy "posts insert own" on public.posts for insert to authenticated with check (auth.uid() = user_id);
create policy "posts delete own or admin" on public.posts for delete to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
grant select on public.post_comments to anon;
grant select, insert, delete on public.post_comments to authenticated;
grant all on public.post_comments to service_role;
alter table public.post_comments enable row level security;
create policy "comments readable" on public.post_comments for select using (true);
create policy "comments insert own" on public.post_comments for insert to authenticated with check (auth.uid() = user_id);
create policy "comments delete own" on public.post_comments for delete to authenticated using (auth.uid() = user_id);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (post_id, user_id)
);
grant select on public.post_likes to anon;
grant select, insert, delete on public.post_likes to authenticated;
grant all on public.post_likes to service_role;
alter table public.post_likes enable row level security;
create policy "likes readable" on public.post_likes for select using (true);
create policy "like own" on public.post_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "unlike own" on public.post_likes for delete to authenticated using (auth.uid() = user_id);

create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.direct_messages to authenticated;
grant all on public.direct_messages to service_role;
alter table public.direct_messages enable row level security;
create policy "dm participants read" on public.direct_messages for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "dm send own" on public.direct_messages for insert to authenticated with check (auth.uid() = sender_id);

-- FAMILIES
create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  banner_url text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
grant select on public.families to anon;
grant select, insert, update, delete on public.families to authenticated;
grant all on public.families to service_role;
alter table public.families enable row level security;
create policy "families readable" on public.families for select using (true);
create policy "families insert own" on public.families for insert to authenticated with check (auth.uid() = owner_id);
create policy "families update owner" on public.families for update to authenticated using (auth.uid() = owner_id);
create policy "families delete owner" on public.families for delete to authenticated using (auth.uid() = owner_id);

create table public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);
grant select on public.family_members to anon;
grant select, insert, delete on public.family_members to authenticated;
grant all on public.family_members to service_role;
alter table public.family_members enable row level security;
create policy "family members readable" on public.family_members for select using (true);
create policy "join family" on public.family_members for insert to authenticated with check (auth.uid() = user_id);
create policy "leave family" on public.family_members for delete to authenticated using (
  auth.uid() = user_id or exists (select 1 from public.families f where f.id = family_id and f.owner_id = auth.uid())
);

alter publication supabase_realtime add table public.room_messages;
alter publication supabase_realtime add table public.room_seats;
alter publication supabase_realtime add table public.gift_events;
alter publication supabase_realtime add table public.direct_messages;
alter publication supabase_realtime add table public.posts;

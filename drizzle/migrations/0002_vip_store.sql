alter table public.profiles add column if not exists vip_level int not null default 0,
  add column if not exists vip_exp bigint not null default 0,
  add column if not exists active_frame text,
  add column if not exists active_entry text;

create table public.store_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  code text not null unique,
  name text not null,
  price bigint not null,
  vip_level int not null default 0,
  sort_order int not null default 0
);
grant select on public.store_items to anon, authenticated;
grant all on public.store_items to service_role;
alter table public.store_items enable row level security;
create policy "store read" on public.store_items for select using (true);
create policy "store admin" on public.store_items for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.user_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.store_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, item_id)
);
grant select on public.user_items to authenticated;
grant all on public.user_items to service_role;
alter table public.user_items enable row level security;
create policy "own items" on public.user_items for select to authenticated using (auth.uid() = user_id);

create or replace function public.buy_store_item(_item uuid) returns void
language plpgsql security definer set search_path = public as $$
declare _it public.store_items; _bal bigint;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into _it from public.store_items where id = _item;
  if _it.id is null then raise exception 'غير موجود'; end if;
  if exists (select 1 from public.user_items where user_id=auth.uid() and item_id=_item) then raise exception 'تملكه مسبقاً'; end if;
  select coins into _bal from public.profiles where id = auth.uid() for update;
  if _bal < _it.price then raise exception 'رصيدك غير كافٍ'; end if;
  update public.profiles set coins = coins - _it.price where id = auth.uid();
  insert into public.user_items (user_id, item_id) values (auth.uid(), _item);
  insert into public.coin_transactions (user_id, amount, kind, note) values (auth.uid(), -_it.price, 'purchase', 'شراء: ' || _it.name);
  if _it.kind = 'vip' then
    update public.profiles set vip_level = greatest(vip_level, _it.vip_level) where id = auth.uid();
  elsif _it.kind = 'frame' then
    update public.profiles set active_frame = _it.code where id = auth.uid();
  elsif _it.kind = 'entry' then
    update public.profiles set active_entry = _it.code where id = auth.uid();
  end if;
end $$;

create or replace function public.equip_store_item(_kind text, _code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if _code is not null and not exists (select 1 from public.user_items ui join public.store_items s on s.id=ui.item_id
     where ui.user_id=auth.uid() and s.code=_code and s.kind=_kind) then raise exception 'لا تملك هذا العنصر'; end if;
  if _kind='frame' then update public.profiles set active_frame=_code where id=auth.uid();
  elsif _kind='entry' then update public.profiles set active_entry=_code where id=auth.uid();
  end if;
end $$;
revoke execute on function public.buy_store_item(uuid) from anon;
revoke execute on function public.equip_store_item(text,text) from anon;

insert into public.store_items (kind, code, name, price, vip_level, sort_order) values
 ('vip','vip1','VIP 1',5000,1,1),('vip','vip2','VIP 2',20000,2,2),('vip','vip3','VIP 3',60000,3,3),('vip','vip4','VIP 4',150000,4,4),('vip','vip5','VIP 5 الملكي',400000,5,5),
 ('frame','lion','الأسد الملكي',97200,0,1),('frame','ghazal','غزل',56160,0,2),('frame','crown','التاج الذهبي',32400,0,3),('frame','diamond','الماسي',48600,0,4),('frame','fire','لهب',19440,0,5),('frame','king','ملك المملكة',300000,0,0),
 ('entry','horse','دخول الخيل العربي',48600,0,1),('entry','falcon','دخول الصقر',97200,0,2),('entry','car','دخول السيارة الفاخرة',126000,0,3),('entry','jet','دخول الطائرة الذهبية',282000,0,4),('entry','dragon','دخول التنين الذهبي',120000,0,5),('entry','royal','دخول ملكي',500000,0,0);
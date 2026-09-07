create or replace function public.claim_super_admin(_pin text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.verify_super_pin(_pin) then raise exception 'الرقم السري غير صحيح'; end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), 'admin')
  on conflict (user_id, role) do nothing;
  return true;
end; $$;
revoke all on function public.claim_super_admin(text) from public, anon;
grant execute on function public.claim_super_admin(text) to authenticated;

create policy "profiles admin update" on public.profiles for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (true);

create policy "families delete admin" on public.families for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

create policy "families update admin" on public.families for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (true);

create policy "gifts admin manage" on public.gifts for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
grant insert, update, delete on public.gifts to authenticated;
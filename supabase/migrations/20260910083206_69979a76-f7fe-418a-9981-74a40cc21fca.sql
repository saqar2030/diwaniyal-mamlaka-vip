alter table public.rooms add constraint rooms_owner_profile_fk foreign key (owner_id) references public.profiles(id) on delete cascade;
alter table public.posts add constraint posts_user_profile_fk foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.room_messages add constraint room_messages_user_profile_fk foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.family_messages add constraint family_messages_user_profile_fk foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.family_members add constraint family_members_user_profile_fk foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.room_roles add constraint room_roles_user_profile_fk foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.room_bans add constraint room_bans_user_profile_fk foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.room_seats add constraint room_seats_user_profile_fk foreign key (user_id) references public.profiles(id) on delete set null;
alter table public.post_comments add constraint post_comments_user_profile_fk foreign key (user_id) references public.profiles(id) on delete cascade;
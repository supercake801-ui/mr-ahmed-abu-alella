create type public.app_role as enum ('admin','teacher','student');
create type public.video_status as enum ('uploading','draft','published','failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 100),
  phone text check (phone is null or char_length(phone) <= 20),
  grade text check (grade is null or char_length(grade) <= 50),
  avatar_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','teacher')) $$;

create or replace function public.is_active_user(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select is_active from public.profiles where id = _user_id), false) $$;

create policy "own profile read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "admin profile update" on public.profiles for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_active is distinct from old.is_active and not public.has_role(auth.uid(),'admin') and auth.uid() is not null then
    raise exception 'not allowed';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_protect before update on public.profiles for each row execute function public.protect_profile_fields();

create policy "read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', ''), 100));
  insert into public.user_roles (user_id, role) values (new.id, 'student');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.teacher_profile (
  id int primary key default 1 check (id = 1),
  display_name text not null default 'أحمد أبو العلا',
  tagline text not null default 'أسد التاريخ',
  bio text not null default '',
  photo_url text,
  updated_at timestamptz not null default now()
);
grant select on public.teacher_profile to anon, authenticated;
grant update on public.teacher_profile to authenticated;
grant all on public.teacher_profile to service_role;
alter table public.teacher_profile enable row level security;
create policy "teacher profile public" on public.teacher_profile for select to anon, authenticated using (id = 1);
create policy "teacher profile staff edit" on public.teacher_profile for update to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
insert into public.teacher_profile (id, bio) values (1, 'مدرس الدراسات الاجتماعية — التاريخ والجغرافيا. شرح مبسّط ومنظّم يساعدك على الفهم والتفوّق.');

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 150),
  description text not null default '' check (char_length(description) <= 3000),
  cover_url text,
  cover_path text,
  is_published boolean not null default false,
  sort_order int not null default 0,
  owner_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index courses_pub_idx on public.courses (is_published, sort_order, created_at desc);
grant select on public.courses to anon, authenticated;
grant insert, update, delete on public.courses to authenticated;
grant all on public.courses to service_role;
alter table public.courses enable row level security;
create policy "courses public read" on public.courses for select to anon, authenticated
  using (is_published or public.is_staff(auth.uid()));
create policy "courses staff insert" on public.courses for insert to authenticated
  with check (public.is_staff(auth.uid()) and owner_id = auth.uid());
create policy "courses owner update" on public.courses for update to authenticated
  using (public.is_staff(auth.uid()) and (owner_id = auth.uid() or public.has_role(auth.uid(),'admin')))
  with check (public.is_staff(auth.uid()) and (owner_id = auth.uid() or public.has_role(auth.uid(),'admin')));
create policy "courses owner delete" on public.courses for delete to authenticated
  using (public.is_staff(auth.uid()) and (owner_id = auth.uid() or public.has_role(auth.uid(),'admin')));

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  title text not null check (char_length(title) between 2 and 200),
  description text not null default '' check (char_length(description) <= 5000),
  video_path text,
  thumbnail_url text,
  thumbnail_path text,
  size_bytes bigint check (size_bytes is null or size_bytes <= 5368709120),
  mime_type text,
  duration_seconds int,
  status public.video_status not null default 'uploading',
  published_at timestamptz,
  owner_id uuid not null,
  has_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index videos_course_idx on public.videos (course_id, status, created_at desc);
create index videos_status_idx on public.videos (status, created_at desc);
grant select, insert, update, delete on public.videos to authenticated;
grant all on public.videos to service_role;
alter table public.videos enable row level security;
create policy "videos read" on public.videos for select to authenticated
  using (public.is_staff(auth.uid())
    or (status = 'published' and public.is_active_user(auth.uid())
        and exists (select 1 from public.courses c where c.id = course_id and c.is_published)));
create policy "videos owner insert" on public.videos for insert to authenticated
  with check (public.is_staff(auth.uid()) and owner_id = auth.uid()
    and exists (select 1 from public.courses c where c.id = course_id and (c.owner_id = auth.uid() or public.has_role(auth.uid(),'admin'))));
create policy "videos owner update" on public.videos for update to authenticated
  using (public.is_staff(auth.uid()) and (owner_id = auth.uid() or public.has_role(auth.uid(),'admin')))
  with check (public.is_staff(auth.uid()) and (owner_id = auth.uid() or public.has_role(auth.uid(),'admin')));
create policy "videos owner delete" on public.videos for delete to authenticated
  using (public.is_staff(auth.uid()) and (owner_id = auth.uid() or public.has_role(auth.uid(),'admin')));

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
create trigger courses_touch before update on public.courses for each row execute function public.touch_updated_at();
create trigger videos_touch before update on public.videos for each row execute function public.touch_updated_at();
create trigger teacher_touch before update on public.teacher_profile for each row execute function public.touch_updated_at();

create policy "videos bucket staff insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'videos' and public.is_staff(auth.uid())
    and lower(storage.extension(name)) in ('mp4','webm','mov','m4v'));
create policy "videos bucket staff update" on storage.objects for update to authenticated
  using (bucket_id = 'videos' and public.is_staff(auth.uid()))
  with check (bucket_id = 'videos' and public.is_staff(auth.uid()));
create policy "videos bucket staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'videos' and public.is_staff(auth.uid()));
create policy "videos bucket staff read" on storage.objects for select to authenticated
  using (bucket_id = 'videos' and public.is_staff(auth.uid()));

create policy "media read owner or staff" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (owner_id = (select auth.uid()::text) or public.is_staff(auth.uid())));
create policy "media staff insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_staff(auth.uid())
    and lower(storage.extension(name)) in ('jpg','jpeg','png','webp'));
create policy "media staff update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_staff(auth.uid()))
  with check (bucket_id = 'media' and public.is_staff(auth.uid()));
create policy "media staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_staff(auth.uid()));

create policy "avatars own read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));
create policy "avatars own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg','jpeg','png','webp'));
create policy "avatars own update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create extension if not exists pgcrypto with schema extensions;

create table public.video_secrets (
  video_id uuid primary key references public.videos(id) on delete cascade,
  password_hash text not null,
  password_plain text,
  updated_at timestamptz not null default now()
);
grant all on public.video_secrets to service_role;
alter table public.video_secrets enable row level security;

create table public.pending_role_grants (
  email text primary key,
  role public.app_role not null,
  created_at timestamptz not null default now()
);
grant all on public.pending_role_grants to service_role;
alter table public.pending_role_grants enable row level security;
insert into public.pending_role_grants(email, role) values ('graphicdesigner2025.oo@gmail.com','teacher')
on conflict (email) do update set role = excluded.role;

create or replace function public.apply_pending_roles()
returns trigger language plpgsql security definer set search_path = public as $$
declare g record;
begin
  if new.email_confirmed_at is null then return new; end if;
  for g in select * from public.pending_role_grants where email = lower(new.email) loop
    insert into public.user_roles(user_id, role) values (new.id, g.role) on conflict do nothing;
    delete from public.pending_role_grants where email = g.email;
  end loop;
  return new;
end $$;
drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed after insert or update of email_confirmed_at on auth.users
for each row execute function public.apply_pending_roles();

create or replace function public.set_video_password(_video_id uuid, _password text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if _password is null then
    delete from public.video_secrets where video_id = _video_id;
    update public.videos set has_password = false where id = _video_id;
  else
    insert into public.video_secrets(video_id, password_hash, password_plain) values (_video_id, crypt(_password, gen_salt('bf', 10)), _password)
    on conflict (video_id) do update set password_hash = excluded.password_hash, password_plain = excluded.password_plain, updated_at = now();
    update public.videos set has_password = true where id = _video_id;
  end if;
end $$;
revoke all on function public.set_video_password(uuid,text) from public, anon, authenticated;
grant execute on function public.set_video_password(uuid,text) to service_role;

create or replace function public.check_video_password(_video_id uuid, _password text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select coalesce((select password_hash = crypt(_password, password_hash) from public.video_secrets where video_id = _video_id), false)
$$;
revoke all on function public.check_video_password(uuid,text) from public, anon, authenticated;
grant execute on function public.check_video_password(uuid,text) to service_role;

create table public.teacher_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  reviewer_name text not null default '',
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index teacher_reviews_created_idx on public.teacher_reviews(created_at desc);
grant select on public.teacher_reviews to anon;
grant select, insert, update, delete on public.teacher_reviews to authenticated;
grant all on public.teacher_reviews to service_role;
alter table public.teacher_reviews enable row level security;
create policy "Anyone reads reviews" on public.teacher_reviews for select to anon, authenticated using (true);
create policy "Own review insert" on public.teacher_reviews for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Own review update" on public.teacher_reviews for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own or staff delete" on public.teacher_reviews for delete to authenticated using (user_id = (select auth.uid()) or public.is_staff(auth.uid()));

create or replace function public.teacher_reviews_fill()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.reviewer_name := coalesce((select full_name from public.profiles where id = new.user_id), '');
  new.comment := btrim(new.comment);
  new.updated_at := now();
  return new;
end $$;
create trigger teacher_reviews_fill before insert or update on public.teacher_reviews
for each row execute function public.teacher_reviews_fill();
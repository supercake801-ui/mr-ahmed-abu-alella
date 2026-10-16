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

-- profiles policies
create policy "own profile read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "admin profile update" on public.profiles for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- prevent users changing is_active themselves
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

-- signup trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', ''), 100));
  insert into public.user_roles (user_id, role) values (new.id, 'student');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- teacher public profile (single row)
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
create policy "teacher profile public" on public.teacher_profile for select to anon, authenticated using (true);
create policy "teacher profile staff edit" on public.teacher_profile for update to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
insert into public.teacher_profile (id, bio) values (1, 'مدرس الدراسات الاجتماعية — التاريخ والجغرافيا. شرح مبسّط ومنظّم يساعدك على الفهم والتفوّق.');

-- courses
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
create policy "courses staff update" on public.courses for update to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "courses staff delete" on public.courses for delete to authenticated
  using (public.is_staff(auth.uid()));

-- videos
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index videos_course_idx on public.videos (course_id, status, created_at desc);
create index videos_status_idx on public.videos (status, created_at desc);
grant select on public.videos to authenticated;
grant insert, update, delete on public.videos to authenticated;
grant all on public.videos to service_role;
alter table public.videos enable row level security;
create policy "videos read" on public.videos for select to authenticated
  using (public.is_staff(auth.uid())
    or (status = 'published' and public.is_active_user(auth.uid())
        and exists (select 1 from public.courses c where c.id = course_id and c.is_published)));
create policy "videos staff insert" on public.videos for insert to authenticated
  with check (public.is_staff(auth.uid()) and owner_id = auth.uid());
create policy "videos staff update" on public.videos for update to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "videos staff delete" on public.videos for delete to authenticated
  using (public.is_staff(auth.uid()));

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
create trigger courses_touch before update on public.courses for each row execute function public.touch_updated_at();
create trigger videos_touch before update on public.videos for each row execute function public.touch_updated_at();
create trigger teacher_touch before update on public.teacher_profile for each row execute function public.touch_updated_at();

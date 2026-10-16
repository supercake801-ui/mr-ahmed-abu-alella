create extension if not exists pgcrypto with schema extensions;

alter table public.videos add column if not exists has_password boolean not null default false;

create table public.video_secrets (
  video_id uuid primary key references public.videos(id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default now()
);
grant all on public.video_secrets to service_role;
alter table public.video_secrets enable row level security;

create table public.pending_role_grants (
  email text primary key,
  role app_role not null,
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
    insert into public.video_secrets(video_id, password_hash) values (_video_id, crypt(_password, gen_salt('bf', 10)))
    on conflict (video_id) do update set password_hash = excluded.password_hash, updated_at = now();
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
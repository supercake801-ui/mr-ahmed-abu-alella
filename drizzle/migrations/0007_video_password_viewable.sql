alter table public.video_secrets add column if not exists password_plain text;
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
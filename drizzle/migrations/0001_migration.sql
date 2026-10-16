create policy "videos bucket staff insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'videos' and public.is_staff(auth.uid())
    and lower(storage.extension(name)) in ('mp4','webm','mov','m4v'));
create policy "videos bucket staff update" on storage.objects for update to authenticated
  using (bucket_id = 'videos' and public.is_staff(auth.uid()))
  with check (bucket_id = 'videos' and public.is_staff(auth.uid()));
create policy "videos bucket staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'videos' and public.is_staff(auth.uid()));
create policy "videos bucket read" on storage.objects for select to authenticated
  using (bucket_id = 'videos' and (public.is_staff(auth.uid())
    or exists (select 1 from public.videos v where v.video_path = storage.objects.name)));

create policy "media read all" on storage.objects for select to anon, authenticated
  using (bucket_id = 'media');
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

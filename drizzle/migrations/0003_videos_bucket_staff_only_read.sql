drop policy if exists "videos bucket read" on storage.objects;
create policy "videos bucket staff read" on storage.objects for select to authenticated
using (bucket_id = 'videos' and public.is_staff(auth.uid()));
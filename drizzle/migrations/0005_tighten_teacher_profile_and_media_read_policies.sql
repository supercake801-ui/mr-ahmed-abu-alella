DROP POLICY IF EXISTS "teacher profile public" ON public.teacher_profile;
CREATE POLICY "teacher profile public" ON public.teacher_profile FOR SELECT TO anon, authenticated
USING (id = 1);

DROP POLICY IF EXISTS "media read referenced" ON storage.objects;
CREATE POLICY "media read referenced" ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'media' AND (
    owner_id = (select auth.uid()::text)
    OR public.is_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.cover_path = storage.objects.name AND c.is_published)
    OR EXISTS (SELECT 1 FROM public.teacher_profile t WHERE t.photo_url = storage.objects.name)
    OR EXISTS (SELECT 1 FROM public.videos v JOIN public.courses c ON c.id = v.course_id
               WHERE v.thumbnail_path = storage.objects.name AND v.status = 'published' AND c.is_published)
  )
);
DROP POLICY IF EXISTS "media read all" ON storage.objects;
CREATE POLICY "media read referenced" ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'media' AND (
    public.is_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.cover_path = storage.objects.name AND c.is_published)
    OR EXISTS (SELECT 1 FROM public.teacher_profile t WHERE t.photo_url = storage.objects.name)
    OR EXISTS (SELECT 1 FROM public.videos v JOIN public.courses c ON c.id = v.course_id
               WHERE v.thumbnail_path = storage.objects.name AND v.status = 'published' AND c.is_published)
  )
);

DROP POLICY IF EXISTS "courses staff update" ON public.courses;
DROP POLICY IF EXISTS "courses staff delete" ON public.courses;
CREATE POLICY "courses owner update" ON public.courses FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()) AND (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
  WITH CHECK (public.is_staff(auth.uid()) AND (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "courses owner delete" ON public.courses FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()) AND (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')));

DROP POLICY IF EXISTS "videos staff update" ON public.videos;
DROP POLICY IF EXISTS "videos staff delete" ON public.videos;
DROP POLICY IF EXISTS "videos staff insert" ON public.videos;
CREATE POLICY "videos owner insert" ON public.videos FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND owner_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (c.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "videos owner update" ON public.videos FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()) AND (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
  WITH CHECK (public.is_staff(auth.uid()) AND (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "videos owner delete" ON public.videos FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()) AND (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')));
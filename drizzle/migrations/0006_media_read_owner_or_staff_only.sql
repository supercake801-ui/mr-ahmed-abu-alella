-- Public images are now handed out by a server function that checks the file is
-- referenced by published content, so the storage rule itself no longer needs
-- an unbound public-read branch: reads stay with the file's owner or staff.
DROP POLICY IF EXISTS "media read referenced" ON storage.objects;

CREATE POLICY "media read owner or staff" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'media'
    AND (owner_id = (SELECT auth.uid()::text) OR public.is_staff(auth.uid()))
  );
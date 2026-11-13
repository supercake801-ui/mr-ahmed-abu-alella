ALTER TABLE public.videos ADD COLUMN quality_paths jsonb NOT NULL DEFAULT '{}'::jsonb, ADD COLUMN captions_vtt text, ADD COLUMN captions_kind text;
CREATE TABLE public.video_ai_state (id boolean PRIMARY KEY DEFAULT true CHECK(id), blocked boolean NOT NULL DEFAULT false, reason text);
GRANT ALL ON public.video_ai_state TO service_role;
ALTER TABLE public.video_ai_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "video vtt staff insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='videos' AND public.is_staff(auth.uid()) AND lower(storage.extension(name))='vtt');
CREATE TABLE public.video_caption_chunks (video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE, audio_hash text NOT NULL, text text NOT NULL, PRIMARY KEY(video_id,audio_hash));
GRANT ALL ON public.video_caption_chunks TO service_role;
ALTER TABLE public.video_caption_chunks ENABLE ROW LEVEL SECURITY;
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { transcriptionPrompt } from './caption-settings';

export const transcribeVideoChunk = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: FormData) => input)
  .handler(async ({ data, context }) => {
    const videoId = z.string().uuid().parse(data.get('videoId'));
    const language = z.enum(['auto', 'ar', 'en']).parse(data.get('language') ?? 'auto');
    const previous = z.string().max(600).parse(String(data.get('previous') ?? '').slice(-600));
    const file = data.get('file');
    if (!(file instanceof File) || !file.size || file.size > 2 * 1024 * 1024 || file.type !== 'audio/wav') throw new Error('ملف الصوت غير صالح');
    const { data: video } = await context.supabase.from('videos').select('owner_id,title').eq('id', videoId).maybeSingle();
    const { data: staff } = await context.supabase.rpc('is_staff', { _user_id: context.userId });
    const { data: admin } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (!video || !staff || (video.owner_id !== context.userId && !admin)) throw new Error('توليد الترجمة لصاحب الفيديو أو الإدارة فقط');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const prompt = transcriptionPrompt(video.title, previous);
    const hashBytes = new Uint8Array(await crypto.subtle.digest('SHA-256', await new Blob([await file.arrayBuffer(), `v2:${language}:${prompt}`]).arrayBuffer()));
    const audioHash = Array.from(hashBytes, b => b.toString(16).padStart(2, '0')).join('');
    const { data: cached } = await supabaseAdmin.from('video_caption_chunks').select('text').eq('video_id', videoId).eq('audio_hash', audioHash).maybeSingle();
    if (cached) return { text: cached.text };
    const { data: state } = await supabaseAdmin.from('video_ai_state').select('*').eq('id', true).maybeSingle();
    if (state?.blocked) throw new Error(state.reason ?? 'توليد الترجمة متوقف؛ استعد الوصول أولًا');
    const { transcribeAudioStream, GatewayError } = await import('@lovable.dev/ai-gateway');
    let text = ''; let done = false;
    try {
      const stream = await transcribeAudioStream({ model: 'openai/gpt-transcribe', file, prompt, ...(language === 'auto' ? {} : { language }), temperature: 0 });
      for await (const event of stream) {
        if (event.type === 'transcript.text.delta') text += event.delta;
        if (event.type === 'transcript.text.done') { text = event.text; done = true; }
      }
      if (!done) throw new Error('لم يكتمل تحويل الصوت');
    } catch (error) {
      if (error instanceof GatewayError && (error.httpStatus === 402 || error.httpStatus === 403)) {
        await supabaseAdmin.from('video_ai_state').upsert({ id: true, blocked: true, reason: 'توليد الترجمة متوقف؛ يلزم استعادة رصيد أو صلاحية خدمة الذكاء الاصطناعي' });
      }
      throw error;
    }
    const { error: cacheError } = await supabaseAdmin.from('video_caption_chunks').upsert({ video_id: videoId, audio_hash: audioHash, text });
    if (cacheError) throw new Error('تعذر حفظ الترجمة؛ توقف التوليد لتجنب إعادة التكلفة');
    return { text };
  });
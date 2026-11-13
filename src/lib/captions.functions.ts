import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { createParser } from 'eventsource-parser';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const transcribeVideoChunk = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: FormData) => input)
  .handler(async ({ data, context }) => {
    const videoId = z.string().uuid().parse(data.get('videoId'));
    const file = data.get('file');
    if (!(file instanceof File) || !file.size || file.size > 2 * 1024 * 1024 || file.type !== 'audio/wav') throw new Error('ملف الصوت غير صالح');
    const { data: video } = await context.supabase.from('videos').select('owner_id').eq('id', videoId).maybeSingle();
    const { data: staff } = await context.supabase.rpc('is_staff', { _user_id: context.userId });
    const { data: admin } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (!video || !staff || (video.owner_id !== context.userId && !admin)) throw new Error('توليد الترجمة لصاحب الفيديو أو الإدارة فقط');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: state } = await supabaseAdmin.from('video_ai_state').select('*').eq('id', true).maybeSingle();
    if (state?.blocked) throw new Error(state.reason ?? 'توليد الترجمة متوقف؛ استعد الوصول أولًا');
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) throw new Error('خدمة الترجمة غير مهيأة');
    const { transcribe } = await import('./server/transcribe.server');
    const response = await transcribe({ baseURL: 'https://ai.gateway.lovable.dev', apiKey: key, model: 'openai/gpt-transcribe', maxFileBytes: 2 * 1024 * 1024, audioOnly: true }, file);
    if (!response.ok) {
      const body = await response.json().catch(() => null) as any;
      const message = body?.error?.message ?? body?.message ?? `تعذر توليد الترجمة (${response.status})`;
      if (response.status === 402 || response.status === 403) await supabaseAdmin.from('video_ai_state').upsert({ id: true, blocked: true, reason: message });
      throw new Error(message);
    }
    let text = ''; let done = false; let failure = '';
    const parser = createParser({ onEvent(event) {
      const value = JSON.parse(event.data);
      if (value.type === 'transcript.text.delta') text += value.delta ?? '';
      if (value.type === 'transcript.text.done') { text = value.text ?? text; done = true; }
      if (value.type === 'error' || value.error) failure = value.error?.message ?? value.message ?? 'فشل تحويل الصوت';
    } });
    if (!response.body) throw new Error('لم تصل الترجمة');
    const reader = response.body.getReader(); const decoder = new TextDecoder();
    while (true) { const part = await reader.read(); if (part.done) break; parser.feed(decoder.decode(part.value, { stream: true })); }
    parser.feed(decoder.decode());
    if (failure || !done) throw new Error(failure || 'لم يكتمل تحويل الصوت');
    return { text };
  });
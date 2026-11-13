import wasm from '@/assets/ffmpeg-core.wasm.asset.json';
import { transcribeVideoChunk } from './captions.functions';
import { cuesToVtt, type CaptionCue } from './video-media';
import type { CaptionLanguage } from './caption-settings';

/** Source-window timestamps, not provider word alignment. Process every window sequentially. */
export async function generateCaptions(videoId: string, source: string, duration: number, progress: (text: string) => void, signal: AbortSignal, language: CaptionLanguage = 'auto') {
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { toBlobURL } = await import('@ffmpeg/util');
  const ffmpeg = new FFmpeg();
  const wasmURL = await toBlobURL(wasm.url, 'application/wasm');
  const coreURL = await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript');
  const cues: CaptionCue[] = [];
  const cancel = () => ffmpeg.terminate();
  signal.addEventListener('abort', cancel, { once: true });
  try {
    progress('جارٍ تجهيز الصوت…');
    await ffmpeg.load({ coreURL, wasmURL });
    const response = await fetch(source, { signal });
    if (!response.ok) throw new Error('تعذر تحميل ملف الفيديو');
    await ffmpeg.writeFile('source', new Uint8Array(await response.arrayBuffer()));
    signal.throwIfAborted();
    const extracted = await ffmpeg.exec(['-i', 'source', '-vn', '-ac', '1', '-ar', '16000', '-y', 'source.wav']);
    if (extracted !== 0) throw new Error('تعذر استخراج صوت الفيديو');
    await ffmpeg.deleteFile('source');
    for (let start = 0; start < duration; start += 8) {
      signal.throwIfAborted();
      progress(`جارٍ توليد الترجمة… ${Math.floor(start / duration * 100)}%`);
      const end = Math.min(duration, start + 8);
      const result = await ffmpeg.exec(['-ss', String(start), '-i', 'source.wav', '-t', String(end-start), '-c:a', 'copy', '-y', 'audio.wav']);
      if (result !== 0) throw new Error('تعذر استخراج صوت الفيديو');
      const audio = await ffmpeg.readFile('audio.wav');
      if (typeof audio === 'string') throw new Error('تعذر قراءة الصوت');
      const form = new FormData(); form.set('videoId', videoId);
      form.set('language', language);
      form.set('previous', cues.at(-1)?.text ?? '');
      form.set('file', new File([new Uint8Array(audio)], 'audio.wav', { type: 'audio/wav' }));
      const { text } = await transcribeVideoChunk({ data: form });
      signal.throwIfAborted();
      if (text.trim()) cues.push({ start, end, text: text.trim() });
    }
    if (!cues.length) throw new Error('لا يوجد كلام قابل للتحويل في الفيديو');
    return cuesToVtt(cues);
  } finally { signal.removeEventListener('abort', cancel); ffmpeg.terminate(); URL.revokeObjectURL(wasmURL); URL.revokeObjectURL(coreURL); }
}
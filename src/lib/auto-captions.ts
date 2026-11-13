import wasm from '@/assets/ffmpeg-core.wasm.asset.json';
import { transcribeVideoChunk } from './captions.functions';
import { cuesToVtt, type CaptionCue } from './video-media';

/** Source-window timestamps, not provider word alignment. Process every window sequentially. */
export async function generateCaptions(videoId: string, source: string, duration: number, progress: (text: string) => void, signal: AbortSignal) {
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { toBlobURL } = await import('@ffmpeg/util');
  const ffmpeg = new FFmpeg();
  const wasmURL = await toBlobURL(wasm.url, 'application/wasm');
  const coreURL = await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript');
  const cues: CaptionCue[] = [];
  try {
    progress('جارٍ تجهيز الصوت…');
    await ffmpeg.load({ coreURL, wasmURL });
    const response = await fetch(source, { signal });
    if (!response.ok) throw new Error('تعذر تحميل ملف الفيديو');
    await ffmpeg.writeFile('source', new Uint8Array(await response.arrayBuffer()));
    for (let start = 0; start < duration; start += 8) {
      signal.throwIfAborted();
      progress(`جارٍ توليد الترجمة… ${Math.floor(start / duration * 100)}%`);
      const end = Math.min(duration, start + 8);
      const result = await ffmpeg.exec(['-ss', String(start), '-i', 'source', '-t', String(end-start), '-vn', '-ac', '1', '-ar', '16000', '-y', 'audio.wav']);
      if (result !== 0) throw new Error('تعذر استخراج صوت الفيديو');
      const audio = await ffmpeg.readFile('audio.wav');
      if (typeof audio === 'string') throw new Error('تعذر قراءة الصوت');
      const form = new FormData(); form.set('videoId', videoId);
      form.set('file', new File([new Uint8Array(audio)], 'audio.wav', { type: 'audio/wav' }));
      const { text } = await transcribeVideoChunk({ data: form });
      signal.throwIfAborted();
      if (text.trim()) cues.push({ start, end, text: text.trim() });
    }
    if (!cues.length) throw new Error('لا يوجد كلام قابل للتحويل في الفيديو');
    return cuesToVtt(cues);
  } finally { ffmpeg.terminate(); URL.revokeObjectURL(wasmURL); URL.revokeObjectURL(coreURL); }
}
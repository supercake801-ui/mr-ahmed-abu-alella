import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getPlaybackUrl } from '@/lib/platform.functions';
import { generateCaptions } from '@/lib/auto-captions';
import { validateVideo, extOf } from '@/lib/media';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createResumableUpload } from '@/lib/upload';

export function VideoMediaPanel({ videoId }: { videoId: string }) {
  const [height, setHeight] = useState('720');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [qualities, setQualities] = useState<Record<string, string>>({});
  const [hasCC, setHasCC] = useState(false);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    void supabase.from('videos').select('quality_paths,captions_vtt').eq('id', videoId).single().then(({ data }) => {
      setQualities((data?.quality_paths ?? {}) as Record<string, string>); setHasCC(!!data?.captions_vtt);
    });
    return () => abort.current?.abort();
  }, [videoId]);
  async function saveCC(vtt: string, kind: string) {
    if (!vtt.trimStart().startsWith('WEBVTT') || !vtt.includes('-->')) throw new Error('ملف WebVTT غير صالح');
    const { error } = await supabase.from('videos').update({ captions_vtt: vtt, captions_kind: kind }).eq('id', videoId);
    if (error) throw error;
    setHasCC(true); toast.success('تم حفظ الترجمة');
  }
  async function auto() {
    setBusy(true); abort.current = new AbortController();
    try {
      const { data: v } = await supabase.from('videos').select('duration_seconds').eq('id', videoId).single();
      const r = await getPlaybackUrl({ data: { videoId } });
      if (!r.ok || !v?.duration_seconds) throw new Error('الفيديو أو مدة التشغيل غير متاحة');
      const vtt = await generateCaptions(videoId, r.url, v.duration_seconds, setStatus, abort.current.signal);
      await saveCC(vtt, 'auto'); setStatus('اكتملت الترجمة التلقائية');
    } catch (e) { if (abort.current?.signal.aborted) setStatus('تم الإيقاف'); else { setStatus(String(e)); toast.error(String(e)); } }
    finally { setBusy(false); }
  }
  async function upload(file: File) {
    const invalid = validateVideo(file); if (invalid) return void toast.error(invalid);
    setBusy(true);
    try {
      const probe = document.createElement('video'); const url = URL.createObjectURL(file);
      const actualHeight = await new Promise<number>((resolve, reject) => { probe.onloadedmetadata = () => resolve(probe.videoHeight); probe.onerror = () => reject(new Error('ملف الفيديو غير قابل للقراءة')); probe.src = url; });
      URL.revokeObjectURL(url);
      if (actualHeight !== Number(height)) throw new Error(`ارتفاع الفيديو ${actualHeight} وليس ${height}p`);
      const path = `${videoId}/quality-${height}-${Date.now()}.${extOf(file)}`;
      await new Promise<void>((resolve, reject) => {
        void createResumableUpload({ bucket: 'videos', path, file, onProgress: (n, total) => setStatus(`رفع الجودة… ${Math.floor(n / total * 100)}%`), onError: reject, onSuccess: resolve }).then(h => h.start()).catch(reject);
      });
      const next = { ...qualities, [height]: path };
      const { error } = await supabase.from('videos').update({ quality_paths: next }).eq('id', videoId);
      if (error) throw error;
      setQualities(next); setStatus('تم حفظ الجودة');
    } catch (e) { toast.error(String(e)); } finally { setBusy(false); }
  }
  return <section className="space-y-3 border-t pt-4">
    <h3 className="font-semibold">الجودات والترجمة</h3>
    <div className="flex items-center gap-2"><Select value={height} onValueChange={setHeight} disabled={busy}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent>{['1080','720','480'].map(h => <SelectItem key={h} value={h}>{h}p</SelectItem>)}</SelectContent></Select>
      <Label className="min-w-0 flex-1">ملف الجودة<Input aria-label="ملف الجودة" type="file" accept="video/mp4,video/webm,video/quicktime" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f); }} /></Label></div>
    <p className="text-sm text-muted-foreground">الجودات المتاحة: {Object.keys(qualities).map(h => `${h}p`).join('، ') || 'المصدر الأصلي'}</p>
    <Label>ملف WebVTT<Input type="file" accept=".vtt,text/vtt" aria-label="ملف WebVTT" disabled={busy} onChange={async e => { const f=e.target.files?.[0]; if (!f) return; try { await saveCC(await f.text(), 'manual'); } catch(error) { toast.error(String(error)); } }} /></Label>
    <Button type="button" variant="outline" disabled={busy || hasCC} onClick={auto}>{hasCC ? 'الترجمة محفوظة' : 'توليد الترجمة تلقائيًا'}</Button>
    {busy && abort.current && <Button type="button" variant="ghost" onClick={() => abort.current?.abort()}>إيقاف التوليد</Button>}
    {status && <p role="status" className="text-sm break-words">{status}</p>}
  </section>;
}
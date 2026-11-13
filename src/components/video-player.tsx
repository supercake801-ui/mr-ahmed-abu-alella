import { useEffect, useRef, useState } from "react";
import { Captions, Check, Gauge, Maximize, Minimize, MoreVertical, Settings2, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { autoQuality, type QualitySource } from "@/lib/video-media";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3] as const;

/** Seek target for a double-tap: right side forward, left side back, clamped to the video. */
export function doubleTapTarget(current: number, duration: number, side: "left" | "right") {
  const next = current + (side === "right" ? 10 : -10);
  return Math.max(0, Math.min(Number.isFinite(duration) ? duration : next, next));
}

export function VideoPlayer({ src, sources = [], captionsVtt, initialTime = 0, onError }: { src: string; sources?: QualitySource[]; captionsVtt?: string | null; initialTime?: number; onError?: (time: number) => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const resumeAt = useRef(initialTime);
  const resumePlaying = useRef(false);
  const [quality, setQuality] = useState("Auto");
  const [activeSrc, setActiveSrc] = useState(src);
  const [captionUrl, setCaptionUrl] = useState<string>();
  const [captionSize, setCaptionSize] = useState('medium');
  const [captionText, setCaptionText] = useState('');
  useEffect(() => {
    if (!captionsVtt) { setCaptionUrl(undefined); return; }
    const url = URL.createObjectURL(new Blob([captionsVtt], { type: 'text/vtt' }));
    setCaptionUrl(url); return () => URL.revokeObjectURL(url);
  }, [captionsVtt]);
  function changeQuality(label: string) {
    const all = [{ label: 'المصدر الأصلي', url: src }, ...sources];
    const chosen = label === 'Auto' ? autoQuality(all, box.current?.clientWidth ?? 1280, (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) : all.find(s => s.label === label);
    if (!chosen) return;
    if (chosen.url === ref.current?.getAttribute('src')) { setQuality(label); return; }
    resumeAt.current = ref.current?.currentTime ?? 0;
    resumePlaying.current = !!ref.current && !ref.current.paused;
    setQuality(label); setActiveSrc(chosen.url);
  }
  useEffect(() => { setActiveSrc(src); setQuality('Auto'); }, [src]);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  function togglePlay() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setPlaying(false));
    else video.pause();
  }
  const [cc, setCc] = useState(false);
  const [hasTracks, setHasTracks] = useState(false);
  const [flash, setFlash] = useState<null | "left" | "right">(null);
  const lastTap = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const sourceKey = sources.map(s => `${s.label}:${s.url}`).join('|');
  useEffect(() => {
    if (quality !== 'Auto' || !box.current) return;
    const observer = new ResizeObserver(() => changeQuality('Auto'));
    observer.observe(box.current);
    return () => observer.disconnect();
  }, [quality, src, sourceKey]);
  function updateCaption(video: HTMLVideoElement) {
    const cues = Array.from(video.textTracks[0]?.cues ?? []);
    setCaptionText(cues.filter(c => c.startTime <= video.currentTime && c.endTime > video.currentTime).map(c => (c as VTTCue).text).join('\n'));
  }
  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === box.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const exit = (event: KeyboardEvent) => { if (event.key === "Escape") setExpanded(false); };
    document.addEventListener("keydown", exit);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", exit);
    };
  }, [expanded]);
  async function toggleFull() {
    if (expanded) { setExpanded(false); return; }
    if (document.fullscreenElement) { await document.exitFullscreen(); return; }
    try {
      if (box.current?.requestFullscreen) await box.current.requestFullscreen();
      else setExpanded(true);
    } catch { setExpanded(true); }
  }

  useEffect(() => { if (ref.current) ref.current.playbackRate = speed; }, [speed, src]);
  useEffect(() => {
    const tracks = ref.current?.textTracks;
    if (!tracks) return;
    for (const t of Array.from(tracks)) t.mode = 'hidden';
  }, [cc, captionUrl, activeSrc]);

  function tap(e: React.PointerEvent<HTMLDivElement>) {
    const v = ref.current; if (!v) return;
    const now = Date.now();
    if (now - lastTap.current < 300) {
      const rect = e.currentTarget.getBoundingClientRect();
      const side = e.clientX - rect.left > rect.width / 2 ? "right" : "left";
      v.currentTime = doubleTapTarget(v.currentTime, v.duration, side);
      setFlash(side); window.setTimeout(() => setFlash(null), 500);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
      window.setTimeout(() => {
        if (lastTap.current === now) { lastTap.current = 0; togglePlay(); }
      }, 300);
    }
  }

  return (
    <div ref={box} className={expanded ? "group fixed inset-0 z-50 flex flex-col bg-navy" : `group relative flex flex-col bg-navy ${full ? "h-full w-full" : ""}`} dir="ltr">
      <div className={`relative min-h-0 ${full || expanded ? "flex-1" : ""}`}>
      <video
        ref={ref} src={activeSrc} disablePictureInPicture playsInline
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => { setTime(e.currentTarget.currentTime); updateCaption(e.currentTarget); }}
        onDurationChange={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
        onVolumeChange={(e) => { setMuted(e.currentTarget.muted); setVolume(e.currentTarget.volume); }}
        className={full || expanded ? "h-full w-full object-contain bg-navy" : "block aspect-video w-full bg-navy"}
        onLoadedMetadata={(e) => {
          e.currentTarget.playbackRate = speed;
          setHasTracks(!!captionUrl);
          if (resumeAt.current) e.currentTarget.currentTime = resumeAt.current;
          if (resumePlaying.current) { resumePlaying.current = false; void e.currentTarget.play().catch(() => setPlaying(false)); }
        }}
        onError={() => { resumeAt.current = ref.current?.currentTime ?? 0; onError?.(resumeAt.current); }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {captionUrl && <track key={captionUrl} kind="captions" src={captionUrl} srcLang="ar" label="العربية" default onLoad={() => { setHasTracks(true); const video = ref.current; if (video) { for (const t of Array.from(video.textTracks)) t.mode = 'hidden'; updateCaption(video); } }} />}
      </video>
      <div className="absolute inset-0 select-none" onPointerUp={tap} aria-hidden />
      {cc && captionText && <div className={`video-captions captions-${captionSize}`} dir="auto" data-testid="video-captions"><span>{captionText}</span></div>}
      {flash && (
        <div className={`pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full bg-navy/70 px-4 py-2 text-lg font-bold text-navy-foreground ${flash === "right" ? "right-[18%]" : "left-[18%]"}`}>
          {flash === "right" ? "+10 ث" : "−10 ث"}
        </div>
      )}
      </div>
      <div className="relative z-10 w-full shrink-0 bg-navy px-2 pb-2 pt-1 text-navy-foreground" role="group" aria-label="شريط تحكم الفيديو">
        <input type="range" min={0} max={duration || 1} step={0.1} value={Math.min(time, duration || 1)} aria-label="موضع تشغيل الفيديو" disabled={!duration} onChange={(e) => { if (ref.current) ref.current.currentTime = Number(e.target.value); }} className="block h-5 w-full cursor-pointer accent-gold" />
        <div className="flex min-w-0 items-center gap-1">
          <Button size="icon" variant="ghost" onClick={togglePlay} aria-label={playing ? "إيقاف مؤقت" : "تشغيل الفيديو"} title={playing ? "إيقاف مؤقت" : "تشغيل الفيديو"} className="shrink-0 text-navy-foreground hover:bg-navy-foreground/10">
            {playing ? <Pause /> : <Play />}
          </Button>
          <Button size="icon" variant="ghost" onClick={() => { if (ref.current) ref.current.muted = !ref.current.muted; }} aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"} title={muted ? "تشغيل الصوت" : "كتم الصوت"} className="shrink-0 text-navy-foreground hover:bg-navy-foreground/10">
            {muted || volume === 0 ? <VolumeX /> : <Volume2 />}
          </Button>
          <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} aria-label="مستوى الصوت" onChange={(e) => { if (ref.current) { ref.current.volume = Number(e.target.value); ref.current.muted = false; } }} className="hidden h-5 w-20 shrink-0 cursor-pointer accent-gold sm:block" />
          <span className="min-w-0 flex-1 whitespace-nowrap text-center text-xs tabular-nums">{clock(time)} / {clock(duration)}</span>
      <Button size="icon" variant="ghost" disabled={!hasTracks} onClick={() => setCc((c) => !c)} aria-pressed={cc} aria-label="الترجمة CC" title={hasTracks ? "الترجمة CC" : "لا توجد ترجمة لهذا الفيديو"} className="shrink-0 text-navy-foreground hover:bg-navy-foreground/10">
        <Captions className="h-5 w-5" />
      </Button>
      <Button size="icon" variant="ghost" onClick={toggleFull} aria-label={full || expanded ? "خروج من ملء الشاشة" : "ملء الشاشة"} title={full || expanded ? "خروج من ملء الشاشة" : "ملء الشاشة"} className="shrink-0 text-navy-foreground hover:bg-navy-foreground/10">
        {full || expanded ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
      </Button>
      <DropdownMenu dir="rtl" modal={false}>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="إعدادات الفيديو" title="إعدادات الفيديو" className="shrink-0 text-navy-foreground hover:bg-navy-foreground/10">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[min(70vh,32rem)] w-56 overflow-y-auto" container={box.current ?? undefined}>
          <DropdownMenuLabel className="flex items-center gap-2"><Gauge className="h-4 w-4" />السُّرْعَة</DropdownMenuLabel>
          <div className="grid grid-cols-3 gap-1 px-1 pb-1">
            {SPEEDS.map((s) => (
              <Button key={s} size="sm" variant={s === speed ? "default" : "ghost"} onClick={() => setSpeed(s)} aria-pressed={s === speed}>{s}×</Button>
            ))}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex items-center gap-2"><Settings2 className="h-4 w-4" />الجَوْدَة</DropdownMenuLabel>
          {['Auto', 'المصدر الأصلي', ...sources.map(s => s.label)].map(label => <DropdownMenuItem key={label} onSelect={() => changeQuality(label)}>{quality === label && <Check className="h-4 w-4" />}{label === 'Auto' ? 'تلقائي (Auto)' : label}</DropdownMenuItem>)}
          {['1080p', '720p', '480p'].filter(label => !sources.some(s => s.label === label)).map(label => <DropdownMenuItem key={label} disabled>{label} — غير متاحة</DropdownMenuItem>)}
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!hasTracks} onSelect={() => setCc((c) => !c)}>
            <Captions className="h-4 w-4" />CC: {hasTracks ? (cc ? "تشغيل" : "إيقاف") : "لا توجد ترجمة لهذا الفيديو"}
          </DropdownMenuItem>
          <DropdownMenuLabel className="flex items-center gap-2"><Captions className="h-4 w-4" />حجم الترجمة</DropdownMenuLabel>
          {([{value:'small',label:'صغير'},{value:'medium',label:'متوسط'},{value:'large',label:'كبير'},{value:'extra-large',label:'كبير جدًا'}]).map(option => <DropdownMenuItem key={option.value} onSelect={() => setCaptionSize(option.value)}>{captionSize === option.value && <Check className="h-4 w-4" />}{option.label}</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useRef, useState } from "react";
import { Captions, Check, Gauge, Maximize, Minimize, MoreVertical, Settings2 } from "lucide-react";
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

export function VideoPlayer({ src, initialTime = 0, onError }: { src: string; initialTime?: number; onError?: (time: number) => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const resumeAt = useRef(initialTime);
  const [speed, setSpeed] = useState(1);
  const [cc, setCc] = useState(false);
  const [hasTracks, setHasTracks] = useState(false);
  const [flash, setFlash] = useState<null | "left" | "right">(null);
  const lastTap = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const [expanded, setExpanded] = useState(false);
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
    for (const t of Array.from(tracks)) t.mode = cc ? "showing" : "hidden";
  }, [cc]);

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
        if (lastTap.current === now) { lastTap.current = 0; if (v.paused) void v.play(); else v.pause(); }
      }, 300);
    }
  }

  return (
    <div ref={box} className={expanded ? "group fixed inset-0 z-50 bg-navy" : "group relative bg-navy"} dir="ltr">
      <video
        ref={ref} src={src} controls controlsList="nodownload noplaybackrate nofullscreen" disablePictureInPicture playsInline
        className={full || expanded ? "h-full w-full bg-navy" : "aspect-video w-full bg-navy"}
        onLoadedMetadata={(e) => {
          e.currentTarget.playbackRate = speed;
          setHasTracks(e.currentTarget.textTracks.length > 0);
          if (resumeAt.current) e.currentTarget.currentTime = resumeAt.current;
        }}
        onError={() => { resumeAt.current = ref.current?.currentTime ?? 0; onError?.(resumeAt.current); }}
        onContextMenu={(e) => e.preventDefault()}
      />
      {/* Tap layer leaves the native control bar usable. */}
      <div className="absolute inset-x-0 top-0 bottom-14 select-none" onPointerUp={tap} aria-hidden />
      {flash && (
        <div className={`pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full bg-navy/70 px-4 py-2 text-lg font-bold text-navy-foreground ${flash === "right" ? "right-[18%]" : "left-[18%]"}`}>
          {flash === "right" ? "+10 ث" : "−10 ث"}
        </div>
      )}
      <div className="absolute bottom-14 right-2 flex shrink-0 items-center gap-1 rounded-md bg-navy/90 p-1 text-navy-foreground">
      <Button size="icon" variant="ghost" disabled={!hasTracks} onClick={() => setCc((c) => !c)} aria-pressed={cc} aria-label="الترجمة CC" title={hasTracks ? "الترجمة CC" : "لا توجد ترجمة لهذا الفيديو"} className="text-navy-foreground hover:bg-navy">
        <Captions className="h-5 w-5" />
      </Button>
      <Button size="icon" variant="ghost" onClick={toggleFull} aria-label={full || expanded ? "خروج من ملء الشاشة" : "ملء الشاشة"} title={full || expanded ? "خروج من ملء الشاشة" : "ملء الشاشة"} className="text-navy-foreground hover:bg-navy">
        {full || expanded ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
      </Button>
      <DropdownMenu dir="rtl" modal={false}>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="إعدادات الفيديو" title="إعدادات الفيديو" className="text-navy-foreground hover:bg-navy">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" container={box.current ?? undefined}>
          <DropdownMenuLabel className="flex items-center gap-2"><Gauge className="h-4 w-4" />السُّرْعَة</DropdownMenuLabel>
          <div className="grid grid-cols-3 gap-1 px-1 pb-1">
            {SPEEDS.map((s) => (
              <Button key={s} size="sm" variant={s === speed ? "default" : "ghost"} onClick={() => setSpeed(s)} aria-pressed={s === speed}>{s}×</Button>
            ))}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex items-center gap-2"><Settings2 className="h-4 w-4" />الجَوْدَة</DropdownMenuLabel>
          <DropdownMenuItem><Check className="h-4 w-4" />تلقائي (Auto) — أفضل جودة متاحة</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!hasTracks} onSelect={() => setCc((c) => !c)}>
            <Captions className="h-4 w-4" />CC: {hasTracks ? (cc ? "تشغيل" : "إيقاف") : "لا توجد ترجمة لهذا الفيديو"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </div>
  );
}
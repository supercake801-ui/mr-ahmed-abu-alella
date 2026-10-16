import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const SIZE = 280; // preview box px
const OUT = 512; // output px

type Props = {
  file: File | null;
  onDone: (cropped: File) => void;
  onCancel: () => void;
};

/** Crop + zoom dialog: drag to pan, slider to zoom, outputs a square image. */
export function AvatarCropDialog({ file, onDone, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) return;
    setReady(false);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const mz = SIZE / Math.min(img.width, img.height);
      setMinZoom(mz);
      setZoom(mz);
      setOff({ x: 0, y: 0 });
      setReady(true);
    };
    img.onerror = () => toast.error("تعذر قراءة الصورة");
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const clamp = useCallback(
    (o: { x: number; y: number }, z: number) => {
      const img = imgRef.current;
      if (!img) return o;
      const w = img.width * z;
      const h = img.height * z;
      return {
        x: Math.min(0, Math.max(SIZE - w, o.x)),
        y: Math.min(0, Math.max(SIZE - h, o.y)),
      };
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !ready) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(img, off.x, off.y, img.width * zoom, img.height * zoom);
  }, [off, zoom, ready]);

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y };
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = drag.current;
    if (!d) return;
    setOff(clamp({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }, zoom));
  }
  function onPointerUp() {
    drag.current = null;
  }

  async function confirm() {
    const img = imgRef.current;
    if (!img || !file) return;
    setBusy(true);
    try {
      const scale = OUT / SIZE;
      const out = document.createElement("canvas");
      out.width = OUT;
      out.height = OUT;
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("no ctx");
      ctx.drawImage(img, off.x * scale, off.y * scale, img.width * zoom * scale, img.height * zoom * scale);
      const blob = await new Promise<Blob | null>((res) => out.toBlob(res, "image/jpeg", 0.9));
      if (!blob) throw new Error("فشل إنشاء الصورة");
      onDone(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
    } catch {
      toast.error("تعذر قصّ الصورة، حاول مجددًا");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent dir="rtl" className="max-w-sm">
        <DialogHeader>
          <DialogTitle>ضبط الصورة</DialogTitle>
          <DialogDescription>اسحب الصورة لتحريكها واستخدم الشريط للتكبير، ثم اضغط اعتماد.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div
            className="relative overflow-hidden rounded-full border-2 border-teal"
            style={{ width: SIZE, height: SIZE }}
          >
            <canvas
              ref={canvasRef}
              width={SIZE}
              height={SIZE}
              className="touch-none cursor-grab active:cursor-grabbing"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              aria-label="منطقة قص الصورة"
            />
          </div>
          <div className="flex w-full items-center gap-3" dir="ltr">
            <span className="text-xs text-muted-foreground">−</span>
            <Slider
              value={[zoom]}
              min={minZoom}
              max={minZoom * 4}
              step={minZoom / 50}
              onValueChange={(vals) => {
                const v = vals[0] ?? minZoom;
                setZoom(v);
                setOff((o) => clamp(o, v));
              }}
              aria-label="تكبير الصورة"
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground">+</span>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={busy}>إلغاء</Button>
          <Button onClick={confirm} disabled={!ready || busy}>{busy ? "جارٍ القص…" : "اعتماد الصورة"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

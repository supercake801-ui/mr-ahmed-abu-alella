import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Film, KeyRound, Pencil, Plus, RotateCcw, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/lib/auth";
import { errMsg, formatDuration, PAGE_SIZE, STATUS_LABEL, useMediaUrl } from "@/lib/data";
import { extOf, formatBytes, uploadImage, validateImage, validateVideo } from "@/lib/media";
import { createResumableUpload, readVideoDuration, type UploadHandle } from "@/lib/upload";
import { deleteVideo, finalizeVideoUpload, getVideoPassword, setVideoPassword, setVideoPublished } from "@/lib/platform.functions";
import { useManagedCourses } from "./courses-panel";
import { Pager } from "@/components/course-card";
import { EmptyState } from "@/components/site-shell";
import { ConfirmAction } from "@/components/confirm";
import { PasswordInput } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type Video = Database["public"]["Tables"]["videos"]["Row"] & { courses: { title: string } | null };

export function VideosPanel() {
  const { session } = useAuth();
  const { isAdmin, loading } = useRoles();
  const uid = session?.user.id;
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<string>("all");
  const [dialog, setDialog] = useState<{ kind: "upload"; video?: Video } | { kind: "edit" | "password"; video: Video } | null>(null);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["studio-videos", uid, isAdmin, page, filter],
    enabled: !!uid && !loading,
    queryFn: async () => {
      let r = supabase.from("videos").select("*, courses(title)", { count: "exact" })
        .order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (!isAdmin) r = r.eq("owner_id", uid!);
      if (filter !== "all") r = r.eq("status", filter as Video["status"]);
      const { data, error, count } = await r;
      if (error) throw error;
      return { rows: data as Video[], total: count ?? 0 };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["studio-videos"] });

  async function togglePublish(v: Video, publish: boolean) {
    try { await setVideoPublished({ data: { videoId: v.id, publish } }); toast.success(publish ? "تم النشر" : "تم إلغاء النشر"); refresh(); }
    catch (e) { toast.error(errMsg(e)); }
  }
  async function remove(v: Video) {
    try { await deleteVideo({ data: { videoId: v.id } }); toast.success("تم حذف الفيديو وملفاته"); refresh(); }
    catch (e) { toast.error(errMsg(e)); refresh(); }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setDialog({ kind: "upload" })}><Plus className="ml-1 h-4 w-4" />رفع فيديو</Button>
      </div>
      {q.error ? <EmptyState text={"تعذر تحميل الفيديوهات: " + errMsg(q.error)} /> : q.isLoading ? <Skeleton className="h-40 rounded-xl" />
        : !q.data?.rows.length ? <EmptyState text="لا توجد فيديوهات بعد." /> : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {q.data.rows.map((v) => (
                <div key={v.id} className="overflow-hidden rounded-xl border bg-card">
                  <Thumb v={v} />
                  <div className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold leading-snug">{v.title}</h3>
                      <Badge variant={v.status === "published" ? "default" : v.status === "failed" ? "destructive" : "secondary"}>{STATUS_LABEL[v.status]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{v.courses?.title ?? "—"} · {formatBytes(v.size_bytes)} {v.duration_seconds ? "· " + formatDuration(v.duration_seconds) : ""}</p>
                    {v.has_password && <p className="flex items-center gap-1 text-xs text-gold"><KeyRound className="h-3 w-3" />محمي بكلمة مرور</p>}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(v.status === "uploading" || v.status === "failed") && (
                        <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "upload", video: v })}><RotateCcw className="ml-1 h-4 w-4" />إعادة الرفع</Button>
                      )}
                      {v.status === "draft" && <Button size="sm" onClick={() => togglePublish(v, true)}>نشر</Button>}
                      {v.status === "published" && <Button size="sm" variant="outline" onClick={() => togglePublish(v, false)}>إلغاء النشر</Button>}
                      {(v.status === "draft" || v.status === "published") && (
                        <Button size="sm" variant="ghost" asChild><Link to="/watch/$videoId" params={{ videoId: v.id }}><Film className="ml-1 h-4 w-4" />معاينة</Link></Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: "edit", video: v })}><Pencil className="ml-1 h-4 w-4" />تعديل</Button>
                      <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: "password", video: v })}><KeyRound className="ml-1 h-4 w-4" />كلمة المرور</Button>
                      <ConfirmAction
                        trigger={<Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="ml-1 h-4 w-4" />حذف</Button>}
                        title="حذف الفيديو؟" text="سيُحذف ملف الفيديو وصورته المصغرة وبياناته نهائيًا." confirm="حذف" onConfirm={() => remove(v)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Pager page={page} total={q.data.total} size={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      {dialog?.kind === "upload" && <UploadDialog retry={dialog.video} onClose={() => { setDialog(null); refresh(); }} />}
      {dialog?.kind === "edit" && <EditDialog video={dialog.video} onClose={() => { setDialog(null); refresh(); }} />}
      {dialog?.kind === "password" && <PasswordDialog video={dialog.video} onClose={() => { setDialog(null); refresh(); }} />}
    </div>
  );
}

function Thumb({ v }: { v: Video }) {
  const { data: url } = useMediaUrl(v.thumbnail_path ?? v.thumbnail_url);
  return url ? (
    <div className="flex aspect-video w-full items-center justify-center bg-navy">
      <img src={url} alt="" className="h-full w-full object-contain" loading="lazy" />
    </div>
  ) : <div className="flex aspect-video items-center justify-center bg-navy/90 text-gold"><Film className="h-10 w-10" /></div>;
}

function UploadDialog({ retry, onClose }: { retry?: Video | undefined; onClose: () => void }) {
  const { session } = useAuth();
  const courses = useManagedCourses(1, 100);
  const [courseId, setCourseId] = useState(retry?.course_id ?? "");
  const [title, setTitle] = useState(retry?.title ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "paused" | "verifying" | "done" | "failed">("idle");
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState("");
  const handle = useRef<UploadHandle | null>(null);
  const videoId = useRef<string | null>(retry?.id ?? null);

  useEffect(() => () => { handle.current?.pause(); }, []);

  function pick(f: File | undefined) {
    if (!f) return;
    const e = validateVideo(f);
    if (e) { toast.error(e); return; }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").slice(0, 150));
  }

  async function start() {
    if (!file) return void toast.error("اختر ملف الفيديو");
    if (!courseId) return void toast.error("اختر المقرر");
    const t = title.trim();
    if (t.length < 2 || t.length > 150) return void toast.error("العنوان بين 2 و150 حرفًا");
    setErr(""); setPct(0); setPhase("uploading");
    try {
      const duration = await readVideoDuration(file);
      const ext = extOf(file);
      let id = videoId.current;
      if (!id) {
        const { data, error } = await supabase.from("videos").insert({
          course_id: courseId, title: t, owner_id: session!.user.id, status: "uploading",
          size_bytes: file.size, mime_type: file.type, duration_seconds: duration,
        }).select("id").single();
        if (error) throw error;
        id = data.id; videoId.current = id;
      }
      const path = `${id}/source.${ext}`;
      const { error: uErr } = await supabase.from("videos").update({
        title: t, course_id: courseId, video_path: path, status: "uploading",
        size_bytes: file.size, mime_type: file.type, duration_seconds: duration,
      }).eq("id", id);
      if (uErr) throw uErr;
      handle.current = await createResumableUpload({
        bucket: "videos", path, file,
        onProgress: (s, tot) => setPct(Math.floor((s / tot) * 100)),
        onError: async (e) => {
          setErr(e.message.includes("413") ? "الملف أكبر من الحد المسموح." : "انقطع الرفع أو فشل. يمكنك الاستئناف.");
          setPhase("failed");
          await supabase.from("videos").update({ status: "failed" }).eq("id", id!);
        },
        onSuccess: async () => {
          setPhase("verifying");
          try {
            const r = await finalizeVideoUpload({ data: { videoId: id! } });
            if (r.ok) { setPhase("done"); toast.success("اكتمل الرفع وتم التحقق من الملف. الفيديو محفوظ كمسودة."); }
            else { setErr(r.message); setPhase("failed"); }
          } catch (e) { setErr(errMsg(e)); setPhase("failed"); }
        },
      });
      handle.current.start();
    } catch (e) {
      setErr(errMsg(e)); setPhase("failed");
    }
  }

  async function cancel() {
    await handle.current?.pause();
    if (videoId.current && !retry) {
      try { await deleteVideo({ data: { videoId: videoId.current } }); } catch { /* row stays as failed */ }
    }
    onClose();
  }

  const running = phase === "uploading" || phase === "verifying";
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !running) onClose(); }}>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => running && e.preventDefault()}>
        <DialogHeader><DialogTitle>{retry ? "إعادة رفع الفيديو" : "رفع فيديو جديد"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>المقرر</Label>
            <Select value={courseId} onValueChange={setCourseId} disabled={phase !== "idle" && phase !== "failed"}>
              <SelectTrigger><SelectValue placeholder={courses.isLoading ? "جارٍ التحميل…" : "اختر المقرر"} /></SelectTrigger>
              <SelectContent>{courses.data?.rows.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
            </Select>
            {courses.data && !courses.data.rows.length && <p className="mt-1 text-xs text-destructive">أنشئ مقررًا أولًا.</p>}
          </div>
          <div><Label htmlFor="vt">العنوان</Label><Input id="vt" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} disabled={running} /></div>
          <div>
            <Label>ملف الفيديو (MP4 / WebM / MOV — حتى 5 جيجابايت)</Label>
            <Button asChild variant="outline" className="mt-1 w-full" disabled={running}>
              <label className="cursor-pointer"><Upload className="ml-1 h-4 w-4" />{file ? `${file.name} (${formatBytes(file.size)})` : "اختيار ملف من الجهاز"}
                <input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" className="hidden" disabled={running} onChange={(e) => pick(e.target.files?.[0])} /></label>
            </Button>
          </div>
          {phase !== "idle" && (
            <div className="space-y-2" aria-live="polite">
              <Progress value={pct} />
              <p className="text-sm">{phase === "uploading" ? `جارٍ الرفع… ${pct}%` : phase === "paused" ? `متوقف مؤقتًا عند ${pct}%` : phase === "verifying" ? "جارٍ التحقق من الملف على الخادم…" : phase === "done" ? "✓ اكتمل الرفع والتحقق." : `✗ ${err}`}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {(phase === "idle" || phase === "failed") && <Button onClick={start} disabled={!file}>{phase === "failed" ? "استئناف / إعادة المحاولة" : "بدء الرفع"}</Button>}
            {phase === "uploading" && <Button variant="outline" onClick={async () => { await handle.current?.pause(); setPhase("paused"); }}>إيقاف مؤقت</Button>}
            {phase === "paused" && <Button onClick={() => { setPhase("uploading"); handle.current?.start(); }}>متابعة</Button>}
            {phase === "done" ? <Button onClick={onClose}>تم</Button>
              : <Button variant="ghost" className="text-destructive" onClick={cancel} disabled={phase === "verifying"}><X className="ml-1 h-4 w-4" />إلغاء{!retry && videoId.current ? " وحذف الملف الجزئي" : ""}</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ video, onClose }: { video: Video; onClose: () => void }) {
  const courses = useManagedCourses(1, 100);
  const [title, setTitle] = useState(video.title);
  const [desc, setDesc] = useState(video.description);
  const [courseId, setCourseId] = useState(video.course_id);
  const [thumb, setThumb] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const t = title.trim();
    if (t.length < 2 || t.length > 150) return void toast.error("العنوان بين 2 و150 حرفًا");
    setBusy(true);
    try {
      const { error } = await supabase.from("videos").update({ title: t, description: desc.trim().slice(0, 5000), course_id: courseId }).eq("id", video.id);
      if (error) throw error;
      if (thumb) {
        const path = `videos/${video.id}/thumb-${Date.now()}.${extOf(thumb)}`;
        await uploadImage("media", path, thumb);
        const { error: e2 } = await supabase.from("videos").update({ thumbnail_path: path }).eq("id", video.id);
        if (e2) { await supabase.storage.from("media").remove([path]); throw e2; }
        if (video.thumbnail_path) await supabase.storage.from("media").remove([video.thumbnail_path]);
      }
      toast.success("تم حفظ التعديلات"); onClose();
    } catch (e) { toast.error("تعذر الحفظ: " + errMsg(e)); } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>تعديل بيانات الفيديو</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label htmlFor="et">العنوان</Label><Input id="et" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label htmlFor="ed">الوصف</Label><Textarea id="ed" rows={4} value={desc} maxLength={5000} onChange={(e) => setDesc(e.target.value)} /></div>
          <div><Label>المقرر</Label>
            <Select value={courseId} onValueChange={setCourseId}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{courses.data?.rows.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>الصورة المصغرة</Label>
            {preview ? <img src={preview} alt="معاينة" className="aspect-video w-full rounded-lg object-cover" /> : <Thumb v={video} />}
            <Button asChild variant="outline" size="sm"><label className="cursor-pointer">اختيار صورة
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]; if (!f) return; const er = validateImage(f); if (er) return void toast.error(er);
                setThumb(f); setPreview(URL.createObjectURL(f));
              }} /></label></Button>
          </div>
          <Button className="w-full" disabled={busy} onClick={save}>{busy ? "جارٍ الحفظ…" : "حفظ"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({ video, onClose }: { video: Video; onClose: () => void }) {
  const [enabled, setEnabled] = useState(video.has_password);
  const [pw, setPw] = useState("");
  const [cur, setCur] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!video.has_password) return;
    getVideoPassword({ data: { videoId: video.id } }).then((r) => setCur(r.password)).catch(() => setCur(null));
  }, [video.id, video.has_password]);
  async function save() {
    if (enabled && pw.length < 4) return void toast.error("كلمة المرور الجديدة 4 أحرف على الأقل");
    setBusy(true);
    try {
      await setVideoPassword({ data: { videoId: video.id, password: enabled ? pw : null } });
      toast.success(enabled ? "تم حفظ كلمة مرور الفيديو" : "تمت إزالة كلمة المرور"); onClose();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>كلمة مرور الفيديو</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">اختيارية ومستقلة لهذا الفيديو فقط. لا تستخدم كلمة مرور حسابك. تشاركها أنت يدويًا مع الطلاب.</p>
          <div className="flex items-center justify-between rounded-lg border p-3"><Label htmlFor="pe">حماية بكلمة مرور</Label><Switch id="pe" checked={enabled} onCheckedChange={setEnabled} /></div>
          {video.has_password && (
            <div><Label htmlFor="vc">كلمة المرور الحالية</Label>
              {cur === undefined ? <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>
                : cur ? <PasswordInput id="vc" value={cur} readOnly dir="ltr" />
                : <p className="text-sm text-muted-foreground">غير متاحة لأنها حُفظت قبل هذه الميزة. عيّن كلمة جديدة لتظهر هنا لاحقًا.</p>}
            </div>
          )}
          {enabled && (
            <div><Label htmlFor="vp">{video.has_password ? "كلمة المرور الجديدة" : "كلمة المرور"}</Label>
              <PasswordInput id="vp" value={pw} maxLength={100} autoComplete="new-password" onChange={(e) => setPw(e.target.value)} /></div>
          )}
          <Button className="w-full" disabled={busy} onClick={save}>{busy ? "جارٍ الحفظ…" : "حفظ"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

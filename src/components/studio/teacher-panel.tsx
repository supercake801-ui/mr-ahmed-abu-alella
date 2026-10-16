import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_TEACHER_PHOTO, errMsg, useMediaUrl, useTeacherProfile } from "@/lib/data";
import { extOf, uploadImage, validateImage } from "@/lib/media";
import { ConfirmAction } from "@/components/confirm";
import { AvatarCropDialog } from "@/components/avatar-crop-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export function TeacherPanel() {
  const { data, isLoading } = useTeacherProfile();
  const qc = useQueryClient();
  const current = useMediaUrl(data?.photo_url).data ?? DEFAULT_TEACHER_PHOTO;
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) { setName(data.display_name); setTagline(data.tagline); setBio(data.bio); }
  }, [data]);

  async function save(resetPhoto = false) {
    if (name.trim().length < 2 || name.length > 100) return void toast.error("الاسم بين 2 و100 حرف");
    if (tagline.length > 100 || bio.length > 5000) return void toast.error("النص طويل جدًا");
    setBusy(true);
    try {
      const old = data?.photo_url && !/^(https?:|\/)/.test(data.photo_url) ? data.photo_url : null;
      let photo: string | null | undefined;
      if (file) {
        const path = `teacher/photo-${Date.now()}.${extOf(file)}`;
        await uploadImage("media", path, file);
        photo = path;
      } else if (resetPhoto) photo = null;
      const { error } = await supabase.from("teacher_profile").update({
        display_name: name.trim(), tagline: tagline.trim(), bio: bio.trim(),
        ...(photo !== undefined ? { photo_url: photo } : {}),
      }).eq("id", 1);
      if (error) { if (photo) await supabase.storage.from("media").remove([photo]); throw error; }
      if (photo !== undefined && old) await supabase.storage.from("media").remove([old]);
      setFile(null); setPreview(null);
      toast.success("تم حفظ صفحة المدرس");
      qc.invalidateQueries({ queryKey: ["teacher-profile"] });
    } catch (e) { toast.error("تعذر الحفظ: " + errMsg(e)); } finally { setBusy(false); }
  }

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <div className="space-y-3">
        <img src={preview ?? current} alt="صورة المدرس" className="aspect-square w-full rounded-xl object-cover" />
        <Button asChild variant="outline" className="w-full"><label className="cursor-pointer">رفع صورة جديدة
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0]; if (!f) return; e.target.value = "";
            const er = validateImage(f); if (er) return void toast.error(er);
            setRawFile(f);
          }} /></label></Button>
        <AvatarCropDialog file={rawFile} onCancel={() => setRawFile(null)} onDone={(c) => {
          setRawFile(null); setFile(c); setPreview(URL.createObjectURL(c));
        }} />
        {file && <Button variant="ghost" className="w-full" onClick={() => { setFile(null); setPreview(null); }}>تراجع عن الصورة</Button>}
        {!file && data?.photo_url && (
          <ConfirmAction
            trigger={<Button variant="ghost" className="w-full text-destructive" disabled={busy}>إزالة الصورة</Button>}
            title="إزالة صورة المدرس؟" text="ستُحذف الصورة الحالية وتظهر الصورة الافتراضية في صفحة المدرس والرئيسية." confirm="إزالة"
            onConfirm={() => save(true)}
          />
        )}
      </div>
      <div className="space-y-4">
        <div><Label htmlFor="tn">الاسم</Label><Input id="tn" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label htmlFor="tt">اللقب</Label><Input id="tt" value={tagline} maxLength={100} onChange={(e) => setTagline(e.target.value)} /></div>
        <div><Label htmlFor="tb">نبذة</Label><Textarea id="tb" rows={6} value={bio} maxLength={5000} onChange={(e) => setBio(e.target.value)} /></div>
        <Button disabled={busy} onClick={() => save()}>{busy ? "جارٍ الحفظ…" : "حفظ"}</Button>
      </div>
    </div>
  );
}

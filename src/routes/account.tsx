import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useMyProfile } from "@/lib/auth";
import { errMsg } from "@/lib/data";
import { extOf, uploadImage, validateImage } from "@/lib/media";
import { useSignedUrl } from "@/lib/media";
import { deleteMyAccount } from "@/lib/platform.functions";
import { RequireAuth, PasswordInput } from "@/components/require-auth";
import { AvatarCropDialog } from "@/components/avatar-crop-dialog";
import { PageTitle } from "@/components/site-shell";
import { ConfirmAction } from "@/components/confirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "حسابي | أسد التاريخ" },
      { name: "description", content: "إعدادات حسابك على موقع أسد التاريخ." },
      { property: "og:title", content: "حسابي | أسد التاريخ" },
      { property: "og:description", content: "إعدادات حسابك على موقع أسد التاريخ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Account />
    </RequireAuth>
  ),
});

function Account() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <PageTitle title="حسابي" subtitle="بياناتك وصورتك وكلمة المرور" />
      <ProfileSection />
      <PasswordSection />
      <DangerZone />
    </div>
  );
}

function ProfileSection() {
  const { session } = useAuth();
  const profile = useMyProfile();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [grade, setGrade] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [busy, setBusy] = useState(false);
  const avatarUrl = useSignedUrl("avatars", profile.data?.avatar_path).data;

  useEffect(() => {
    if (profile.data) {
      setName(profile.data.full_name);
      setPhone(profile.data.phone ?? "");
      setGrade(profile.data.grade ?? "");
    }
  }, [profile.data]);

  async function save() {
    const t = name.trim();
    if (t.length < 3 || t.length > 100) return void toast.error("الاسم بين 3 و100 حرف");
    if (phone.length > 20) return void toast.error("رقم الهاتف طويل جدًا");
    setBusy(true);
    try {
      const uid = session!.user.id;
      const old = profile.data?.avatar_path;
      let avatar: string | null | undefined;
      if (file) {
        avatar = `${uid}/avatar-${Date.now()}.${extOf(file)}`;
        await uploadImage("avatars", avatar, file);
      } else if (removeAvatar && old) avatar = null;
      const { error } = await supabase.from("profiles").update({
        full_name: t, phone: phone.trim() || null, grade: grade.trim() || null,
        ...(avatar !== undefined ? { avatar_path: avatar } : {}),
      }).eq("id", uid);
      if (error) { if (avatar) await supabase.storage.from("avatars").remove([avatar]); throw error; }
      if (avatar !== undefined && old) await supabase.storage.from("avatars").remove([old]);
      setFile(null); setPreview(null); setRemoveAvatar(false);
      toast.success("تم حفظ بياناتك");
      qc.invalidateQueries({ queryKey: ["profile", uid] });
    } catch (e) { toast.error("تعذر الحفظ: " + errMsg(e)); } finally { setBusy(false); }
  }

  if (profile.isLoading) return <Skeleton className="h-64 rounded-xl" />;
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <h2 className="mb-4 font-display text-xl text-navy">البيانات الشخصية</h2>
      <div className="grid gap-6 sm:grid-cols-[140px_1fr]">
        <div className="space-y-2">
          {preview ? (
            <img src={preview} alt="معاينة الصورة" className="h-32 w-32 rounded-full object-cover" />
          ) : !removeAvatar && avatarUrl ? (
            <img src={avatarUrl} alt="صورتك" className="h-32 w-32 rounded-full object-cover" />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-navy font-display text-3xl text-gold">
              {(name || "؟").trim().charAt(0)}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <Button asChild variant="outline" size="sm"><label className="cursor-pointer">رفع صورة
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]; if (!f) return;
                e.target.value = "";
                const er = validateImage(f); if (er) return void toast.error(er);
                setRawFile(f);
              }} /></label></Button>
            {(file || (profile.data?.avatar_path && !removeAvatar)) && (
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setFile(null); setPreview(null); setRemoveAvatar(true); }}>إزالة الصورة</Button>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div><Label htmlFor="an">الاسم بالكامل</Label><Input id="an" value={name} maxLength={100} autoComplete="name" onChange={(e) => setName(e.target.value)} /></div>
          <div><Label htmlFor="ap">الهاتف (اختياري)</Label><Input id="ap" dir="ltr" value={phone} maxLength={20} autoComplete="tel" onChange={(e) => setPhone(e.target.value)} /></div>
          <div><Label htmlFor="ag">الصف الدراسي (اختياري)</Label><Input id="ag" value={grade} maxLength={50} onChange={(e) => setGrade(e.target.value)} /></div>
          <Button disabled={busy} onClick={save}>{busy ? "جارٍ الحفظ…" : "حفظ البيانات"}</Button>
        </div>
      </div>
      <AvatarCropDialog
        file={rawFile}
        onCancel={() => setRawFile(null)}
        onDone={(cropped) => {
          setRawFile(null);
          setFile(cropped);
          setPreview(URL.createObjectURL(cropped));
          setRemoveAvatar(false);
        }}
      />
    </section>
  );
}

function PasswordSection() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const { session } = useAuth();

  async function save() {
    if (next.length < 8) return void toast.error("كلمة المرور الجديدة 8 أحرف على الأقل");
    setBusy(true);
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: session!.user.email!, password: cur });
      if (signErr) throw new Error("كلمة المرور الحالية غير صحيحة");
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      setCur(""); setNext("");
      toast.success("تم تغيير كلمة المرور");
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl text-navy"><KeyRound className="h-5 w-5 text-teal" />تغيير كلمة المرور</h2>
      <div className="max-w-sm space-y-4">
        <div><Label htmlFor="cur-pw">كلمة المرور الحالية</Label>
          <PasswordInput id="cur-pw" dir="ltr" autoComplete="current-password" value={cur} maxLength={72} onChange={(e) => setCur(e.target.value)} /></div>
        <div><Label htmlFor="new-pw">كلمة المرور الجديدة</Label>
          <PasswordInput id="new-pw" dir="ltr" autoComplete="new-password" value={next} maxLength={72} onChange={(e) => setNext(e.target.value)} /></div>
        <Button disabled={busy || !cur || !next} onClick={save}>{busy ? "جارٍ الحفظ…" : "تغيير كلمة المرور"}</Button>
      </div>
    </section>
  );
}

function DangerZone() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function remove() {
    setBusy(true);
    try {
      await deleteMyAccount({ data: { password: pw, confirm: "احذف حسابي" } });
      await supabase.auth.signOut();
      toast.success("تم حذف حسابك نهائيًا");
      navigate({ to: "/" });
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }

  return (
    <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-6">
      <h2 className="mb-2 flex items-center gap-2 font-display text-xl text-destructive"><Trash2 className="h-5 w-5" />حذف الحساب نهائيًا</h2>
      <p className="mb-4 text-sm text-muted-foreground">سيُحذف حسابك وصورتك نهائيًا ولا يمكن التراجع. للتأكيد اكتب كلمة المرور وعبارة «احذف حسابي».</p>
      <div className="max-w-sm space-y-3">
        <PasswordInput dir="ltr" autoComplete="current-password" value={pw} maxLength={72} onChange={(e) => setPw(e.target.value)} placeholder="كلمة المرور" aria-label="كلمة المرور لتأكيد الحذف" />
        <Input value={confirm} maxLength={20} onChange={(e) => setConfirm(e.target.value)} placeholder="اكتب: احذف حسابي" aria-label="عبارة تأكيد الحذف" />
        <ConfirmAction
          trigger={<Button variant="destructive" disabled={busy || !pw || confirm !== "احذف حسابي"}>{busy ? "جارٍ الحذف…" : "حذف حسابي نهائيًا"}</Button>}
          title="تأكيد أخير" text="هل أنت متأكد تمامًا؟ لا يمكن استرجاع الحساب بعد الحذف." confirm="نعم، احذف" onConfirm={remove}
        />
      </div>
    </section>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/lib/auth";
import { errMsg, PAGE_SIZE } from "@/lib/data";
import { extOf, uploadImage, validateImage } from "@/lib/media";
import { CourseCover, Pager } from "@/components/course-card";
import { EmptyState } from "@/components/site-shell";
import { ConfirmAction } from "@/components/confirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Database } from "@/integrations/supabase/types";

export type Course = Database["public"]["Tables"]["courses"]["Row"];

/** Courses the current staff member can manage (admins: all). */
export function useManagedCourses(page = 1, size = PAGE_SIZE) {
  const { session } = useAuth();
  const { isAdmin, loading } = useRoles();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ["studio-courses", uid, isAdmin, page, size],
    enabled: !!uid && !loading,
    queryFn: async () => {
      let q = supabase.from("courses").select("*", { count: "exact" })
        .order("sort_order").order("created_at", { ascending: false })
        .range((page - 1) * size, page * size - 1);
      if (!isAdmin) q = q.eq("owner_id", uid!);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data, total: count ?? 0 };
    },
  });
}

export function CoursesPanel() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useManagedCourses(page);
  const [editing, setEditing] = useState<Course | "new" | null>(null);
  const qc = useQueryClient();
  const [publishing, setPublishing] = useState<string | null>(null);

  async function togglePublish(c: Course) {
    setPublishing(c.id);
    const { error } = await supabase.from("courses").update({ is_published: !c.is_published }).eq("id", c.id);
    setPublishing(null);
    if (error) return void toast.error("تعذر تغيير حالة النشر: " + error.message);
    toast.success(c.is_published ? "تم إلغاء نشر المقرر" : "تم نشر المقرر");
    qc.invalidateQueries({ queryKey: ["studio-courses"] });
    qc.invalidateQueries({ queryKey: ["courses"] });
  }

  async function remove(c: Course) {
    const { count } = await supabase.from("videos").select("id", { count: "exact", head: true }).eq("course_id", c.id);
    if ((count ?? 0) > 0) return void toast.error("احذف فيديوهات المقرر أولًا قبل حذفه.");
    const { error } = await supabase.from("courses").delete().eq("id", c.id);
    if (error) return void toast.error("تعذر حذف المقرر: " + error.message);
    if (c.cover_path) await supabase.storage.from("media").remove([c.cover_path]);
    toast.success("تم حذف المقرر");
    qc.invalidateQueries({ queryKey: ["studio-courses"] });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end"><Button onClick={() => setEditing("new")}><Plus className="ml-1 h-4 w-4" />مقرر جديد</Button></div>
      {error ? <EmptyState text={"تعذر تحميل المقررات: " + errMsg(error)} /> : isLoading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : !data?.rows.length ? <EmptyState text="لا توجد مقررات بعد. أنشئ أول مقرر." /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.rows.map((c) => (
              <div key={c.id} className="overflow-hidden rounded-xl border bg-card">
                <div className="aspect-video overflow-hidden"><CourseCover course={c} /></div>
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold">{c.title}</h3>
                    <Badge variant={c.is_published ? "default" : "secondary"}>{c.is_published ? "منشور" : "مسودة"}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(c)}><Pencil className="ml-1 h-4 w-4" />تعديل</Button>
                    <Button size="sm" variant="outline" disabled={publishing === c.id} onClick={() => togglePublish(c)}>
                      {publishing === c.id ? "…" : c.is_published ? "إلغاء النشر" : "نشر"}
                    </Button>
                    <ConfirmAction
                      trigger={<Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="ml-1 h-4 w-4" />حذف</Button>}
                      title="حذف المقرر؟" text="سيُحذف المقرر وصورة غلافه نهائيًا. لا يمكن التراجع." confirm="حذف"
                      onConfirm={() => remove(c)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pager page={page} total={data.total} size={PAGE_SIZE} onChange={setPage} />
        </>
      )}
      {editing && <CourseDialog course={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function CourseDialog({ course, onClose }: { course: Course | null; onClose: () => void }) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState(course?.title ?? "");
  const [desc, setDesc] = useState(course?.description ?? "");
  const [pub, setPub] = useState(course?.is_published ?? false);
  const [order, setOrder] = useState(course?.sort_order ?? 0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [busy, setBusy] = useState(false);

  function pick(f: File | undefined) {
    if (!f) return;
    const e = validateImage(f);
    if (e) return void toast.error(e);
    setFile(f); setPreview(URL.createObjectURL(f)); setRemoveCover(false);
  }

  async function save() {
    const t = title.trim();
    if (t.length < 2 || t.length > 150) return void toast.error("العنوان بين 2 و150 حرفًا");
    if (desc.length > 5000) return void toast.error("الوصف طويل جدًا");
    setBusy(true);
    try {
      let id = course?.id;
      const fields = { title: t, description: desc.trim(), is_published: pub, sort_order: Number(order) || 0 };
      if (!id) {
        const { data, error } = await supabase.from("courses").insert({ ...fields, owner_id: session!.user.id }).select("id").single();
        if (error) throw error;
        id = data.id;
      } else {
        const { error } = await supabase.from("courses").update(fields).eq("id", id);
        if (error) throw error;
      }
      const old = course?.cover_path;
      if (file) {
        const path = `courses/${id}/cover-${Date.now()}.${extOf(file)}`;
        await uploadImage("media", path, file);
        const { error } = await supabase.from("courses").update({ cover_path: path, cover_url: null }).eq("id", id);
        if (error) { await supabase.storage.from("media").remove([path]); throw error; }
        if (old) await supabase.storage.from("media").remove([old]);
      } else if (removeCover && old) {
        const { error } = await supabase.from("courses").update({ cover_path: null, cover_url: null }).eq("id", id);
        if (error) throw error;
        await supabase.storage.from("media").remove([old]);
      }
      toast.success(course ? "تم حفظ التعديلات" : "تم إنشاء المقرر");
      qc.invalidateQueries({ queryKey: ["studio-courses"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      onClose();
    } catch (e) {
      toast.error("تعذر الحفظ: " + errMsg(e));
    } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{course ? "تعديل المقرر" : "مقرر جديد"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label htmlFor="ct">العنوان</Label><Input id="ct" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label htmlFor="cd">الوصف</Label><Textarea id="cd" value={desc} rows={4} maxLength={5000} onChange={(e) => setDesc(e.target.value)} /></div>
          <div><Label htmlFor="co">الترتيب</Label><Input id="co" type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} /></div>
          <div className="space-y-2">
            <Label>صورة الغلاف</Label>
            {preview ? <img src={preview} alt="معاينة الغلاف" className="aspect-video w-full rounded-lg object-cover" />
              : course && !removeCover ? <CourseCover course={course} /> : null}
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm"><label className="cursor-pointer"><ImagePlus className="ml-1 h-4 w-4" />{course?.cover_path || file ? "استبدال" : "اختيار صورة"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} /></label></Button>
              {(file || course?.cover_path) && !removeCover && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setFile(null); setPreview(null); setRemoveCover(true); }}>إزالة الصورة</Button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3"><Label htmlFor="cp">منشور للطلاب</Label><Switch id="cp" checked={pub} onCheckedChange={setPub} /></div>
          <Button className="w-full" disabled={busy} onClick={save}>{busy ? "جارٍ الحفظ…" : "حفظ"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GraduationCap, ShieldCheck, UserRound, Users, BookOpen, Film, PlayCircle } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { PageTitle, EmptyState } from "@/components/site-shell";
import { ConfirmAction } from "@/components/confirm";
import { adminListUsers, adminSetActive, adminSetRole, adminStats } from "@/lib/platform.functions";
import { errMsg } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "إدارة الحسابات | أسد التاريخ" },
      { name: "description", content: "إدارة الحسابات والأدوار على موقع أسد التاريخ." },
      { property: "og:title", content: "إدارة الحسابات | أسد التاريخ" },
      { property: "og:description", content: "إدارة الحسابات والأدوار." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth need="admin">
      <AdminUsers />
    </RequireAuth>
  ),
});

type AdminUser = {
  id: string; email: string; created_at: string; full_name: string; is_active: boolean; roles: string[];
};

function AdminUsers() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: () => adminStats({ data: {} as never }) as Promise<{ users: number; courses: number; videos: number; published: number }> });
  const users = useQuery({
    queryKey: ["admin-users", page],
    queryFn: () => adminListUsers({ data: { page } }) as Promise<{ users: AdminUser[]; hasMore: boolean }>,
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageTitle title="إدارة الحسابات" subtitle="المستخدمون والأدوار وحالات الحسابات" />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { i: Users, l: "المستخدمون", v: stats.data?.users },
          { i: BookOpen, l: "المقررات", v: stats.data?.courses },
          { i: Film, l: "الفيديوهات", v: stats.data?.videos },
          { i: PlayCircle, l: "المنشور", v: stats.data?.published },
        ].map(({ i: Icon, l, v }) => (
          <div key={l} className="rounded-xl border border-border bg-card p-4 text-center shadow-[var(--shadow-card)]">
            <Icon className="mx-auto h-6 w-6 text-teal" />
            <p className="mt-1 font-display text-2xl text-navy">{v ?? "…"}</p>
            <p className="text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
      {users.error ? <EmptyState text={"تعذر تحميل الحسابات: " + errMsg(users.error)} />
        : users.isLoading ? <Skeleton className="h-64 rounded-xl" />
        : !users.data?.users.length ? <EmptyState text="لا توجد حسابات." /> : (
          <>
            <ul className="space-y-3">
              {users.data.users.map((u) => <UserRow key={u.id} u={u} onChanged={refresh} />)}
            </ul>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</button>
              <span className="text-sm text-muted-foreground">صفحة {page}</span>
              <button className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-40" disabled={!users.data.hasMore} onClick={() => setPage(page + 1)}>التالي</button>
            </div>
          </>
        )}
    </div>
  );
}

function UserRow({ u, onChanged }: { u: AdminUser; onChanged: () => void }) {
  const { session } = useAuth();
  const me = session?.user.id === u.id;
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<null | { role: "admin" | "teacher" }>(null);

  const isAdmin = u.roles.includes("admin");
  const isTeacher = u.roles.includes("teacher");
  const roleName = (r: "admin" | "teacher") => (r === "admin" ? "الإدارة" : "المدرس");

  async function setRole(role: "admin" | "teacher", grant: boolean) {
    setBusy(true);
    try {
      await adminSetRole({ data: { userId: u.id, role, grant } });
      toast.success(grant ? `تم منح دور ${roleName(role)}` : `تم سحب دور ${roleName(role)}`);
      onChanged();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); setAsk(null); }
  }
  async function setActive(active: boolean) {
    setBusy(true);
    try { await adminSetActive({ data: { userId: u.id, active } }); toast.success(active ? "تم تفعيل الحساب" : "تم إيقاف الحساب"); onChanged(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }
  /** Granting is instant; removing a role always asks first, and can be undone later. */
  function toggleRole(role: "admin" | "teacher", grant: boolean) {
    if (grant) { void setRole(role, true); return; }
    setAsk({ role });
  }

  return (
    <li className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center gap-3">
        <UserRound className="h-8 w-8 shrink-0 text-teal" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{u.full_name || "بدون اسم"}{me && <span className="text-xs text-muted-foreground"> (أنت)</span>}</p>
          <p className="truncate text-sm text-muted-foreground" dir="ltr">{u.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isTeacher && !isAdmin && <Badge variant="secondary"><UserRound className="ml-1 h-3 w-3" />طالب</Badge>}
          {isTeacher && <Badge><GraduationCap className="ml-1 h-3 w-3" />مدرس</Badge>}
          {isAdmin && <Badge className="bg-gold text-gold-foreground"><ShieldCheck className="ml-1 h-3 w-3" />إدارة</Badge>}
          {!u.is_active && <Badge variant="destructive">موقوف</Badge>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-3 text-sm">
        <label className="flex items-center gap-2">
          <Switch disabled={busy} checked={isTeacher} onCheckedChange={(v) => toggleRole("teacher", v)} />
          <span>مدرس</span>
        </label>
        <label className="flex items-center gap-2">
          <Switch disabled={busy} checked={isAdmin} onCheckedChange={(v) => toggleRole("admin", v)} />
          <span>إدارة</span>
        </label>
        {!me && (
          u.is_active ? (
            <ConfirmAction
              trigger={<Button size="sm" variant="ghost" className="text-destructive" disabled={busy}>إيقاف الحساب</Button>}
              title="إيقاف الحساب؟" text="لن يتمكن المستخدم من مشاهدة الفيديوهات حتى إعادة التفعيل." confirm="إيقاف" onConfirm={() => setActive(false)}
            />
          ) : (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setActive(true)}>إعادة التفعيل</Button>
          )
        )}
        <span className="text-xs text-muted-foreground">امنح الدور أو اسحبه في أي وقت — السحب يطلب تأكيدًا.</span>
        <AlertDialog open={!!ask} onOpenChange={(o) => { if (!o) setAsk(null); }}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader className="text-right">
              <AlertDialogTitle>{ask ? `سحب دور ${roleName(ask.role)}؟` : "سحب الدور؟"}</AlertDialogTitle>
              <AlertDialogDescription>
                {ask?.role === "admin"
                  ? "سيفقد هذا الحساب لوحة الإدارة فورًا. يمكنك منحه الإدارة مرة أخرى بضغطة واحدة في أي وقت."
                  : "سيفقد هذا الحساب إمكانية الرفع والنشر. يمكنك منحه دور المدرس مرة أخرى بضغطة واحدة في أي وقت."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => ask && setRole(ask.role, false)}>سحب الدور</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}

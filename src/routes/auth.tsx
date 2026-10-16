import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/require-auth";
import { useAuth } from "@/lib/auth";

const search = z.object({ mode: z.enum(["signin", "signup"]).optional(), redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | أسد التاريخ" },
      { name: "description", content: "سجّل الدخول أو أنشئ حساب طالب على منصة أسد التاريخ." },
      { property: "og:title", content: "تسجيل الدخول | أسد التاريخ" },
      { property: "og:description", content: "حساب الطالب على منصة أسد التاريخ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  full_name: z.string().trim().min(3, "الاسم قصير جدًا").max(100),
  email: z.string().trim().email("بريد إلكتروني غير صحيح").max(255),
  password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل").max(72),
});

function safePath(p?: string) {
  return p && p.startsWith("/") && !p.startsWith("//") ? p : "/dashboard";
}

function AuthPage() {
  const { mode = "signin", redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });

  useEffect(() => {
    if (session) navigate({ to: safePath(redirect) });
  }, [session, redirect, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const parsed = signupSchema.safeParse(form);
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { data: { full_name: parsed.data.full_name }, emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        if (!data.session) toast.success("تم إنشاء الحساب. افتح بريدك الإلكتروني لتأكيد الحساب ثم سجّل الدخول.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (error) throw new Error(error.message.includes("Email not confirmed") ? "يرجى تأكيد بريدك الإلكتروني أولًا" : "البريد أو كلمة المرور غير صحيحة");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="mb-6 grid grid-cols-2 rounded-lg bg-muted p-1">
          <Link to="/auth" search={{ mode: "signin", redirect }} className={`rounded-md py-2 text-center text-sm font-medium ${mode === "signin" ? "bg-card shadow" : "text-muted-foreground"}`}>دخول</Link>
          <Link to="/auth" search={{ mode: "signup", redirect }} className={`rounded-md py-2 text-center text-sm font-medium ${mode === "signup" ? "bg-card shadow" : "text-muted-foreground"}`}>حساب جديد</Link>
        </div>
        <h1 className="mb-6 font-display text-2xl text-navy">{mode === "signup" ? "إنشاء حساب طالب" : "تسجيل الدخول"}</h1>
        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="full_name">الاسم بالكامل</Label>
              <Input id="full_name" required maxLength={100} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input id="email" type="email" dir="ltr" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <PasswordInput id="password" dir="ltr" required autoComplete={mode === "signup" ? "new-password" : "current-password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "جارٍ..." : mode === "signup" ? "إنشاء الحساب" : "دخول"}</Button>
        </form>
        {mode === "signin" && (
          <Link to="/forgot-password" className="mt-4 block text-center text-sm text-teal hover:underline">نسيت كلمة المرور؟</Link>
        )}
      </div>
    </div>
  );
}

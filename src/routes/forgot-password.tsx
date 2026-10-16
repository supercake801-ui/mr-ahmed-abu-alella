import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "استعادة كلمة المرور | أسد التاريخ" },
      { name: "description", content: "أرسل رابط إعادة تعيين كلمة المرور إلى بريدك." },
      { property: "og:title", content: "استعادة كلمة المرور | أسد التاريخ" },
      { property: "og:description", content: "إعادة تعيين كلمة المرور." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) toast.error("تعذر الإرسال، حاول لاحقًا");
    else setSent(true);
  }
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <h1 className="mb-4 font-display text-2xl text-navy">استعادة كلمة المرور</h1>
        {sent ? (
          <p>إذا كان البريد مسجلًا، ستصلك رسالة بها رابط لإعادة تعيين كلمة المرور.</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>إرسال الرابط</Button>
          </form>
        )}
        <Link to="/auth" search={{ mode: "signin" }} className="mt-4 block text-center text-sm text-teal hover:underline">العودة لتسجيل الدخول</Link>
      </div>
    </div>
  );
}

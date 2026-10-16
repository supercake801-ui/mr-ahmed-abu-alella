import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/require-auth";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "تعيين كلمة مرور جديدة | أسد التاريخ" },
      { name: "description", content: "اختر كلمة مرور جديدة لحسابك." },
      { property: "og:title", content: "تعيين كلمة مرور جديدة | أسد التاريخ" },
      { property: "og:description", content: "كلمة مرور جديدة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { toast.error("كلمة المرور 8 أحرف على الأقل"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) toast.error("الرابط منتهي أو غير صالح. اطلب رابطًا جديدًا.");
    else {
      toast.success("تم تغيير كلمة المرور");
      navigate({ to: "/dashboard" });
    }
  }
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <h1 className="font-display text-2xl text-navy">كلمة مرور جديدة</h1>
        <div className="space-y-2">
          <Label htmlFor="pw">كلمة المرور الجديدة</Label>
          <PasswordInput id="pw" dir="ltr" required autoComplete="new-password" value={pw} maxLength={72} onChange={(e) => setPw(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>حفظ</Button>
      </form>
    </div>
  );
}

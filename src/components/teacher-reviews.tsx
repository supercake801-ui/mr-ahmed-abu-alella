import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { errMsg } from "@/lib/data";

function Stars({ value, onPick, size = "h-5 w-5" }: { value: number; onPick?: (n: number) => void; size?: string }) {
  return (
    <div className="flex gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onPick} onClick={() => onPick?.(n)} aria-label={`${n} نجوم`} className="disabled:cursor-default">
          <Star className={`${size} ${n <= value ? "fill-gold text-gold" : "text-muted-foreground/40"}`} />
        </button>
      ))}
    </div>
  );
}

export function TeacherReviews({ limit = 20 }: { limit?: number }) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const uid = session?.user.id;
  const list = useQuery({
    queryKey: ["teacher-reviews", limit],
    queryFn: async () => {
      const { data, error } = await supabase.from("teacher_reviews").select("*").order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return data;
    },
  });
  const mine = list.data?.find((r) => r.user_id === uid);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const avg = list.data?.length ? list.data.reduce((s, r) => s + r.rating, 0) / list.data.length : 0;

  async function submit() {
    if (!uid || !rating) return;
    setBusy(true);
    try {
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle();
      const row = { user_id: uid, rating, comment: comment.trim().slice(0, 1000), reviewer_name: p?.full_name ?? "" };
      const { error } = mine
        ? await supabase.from("teacher_reviews").update(row).eq("id", mine.id)
        : await supabase.from("teacher_reviews").insert(row);
      if (error) throw error;
      toast.success("شُكْرًا! تَمَّ حِفْظُ تَقْيِيمِك");
      qc.invalidateQueries({ queryKey: ["teacher-reviews"] });
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }

  return (
    <section id="reviews" className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-navy">آراء الطلاب</h2>
        {!!list.data?.length && (
          <div className="flex items-center gap-2"><Stars value={Math.round(avg)} /><span className="text-sm text-muted-foreground">{avg.toFixed(1)} من {list.data.length} تقييم</span></div>
        )}
      </div>
      {session ? (
        <div className="mt-5 space-y-3 rounded-xl bg-muted/50 p-4">
          <p className="text-sm font-medium">{mine ? "عَدِّلْ تَقْيِيمَك" : "قَيِّمِ المُدَرِّس"}</p>
          <Stars value={rating || mine?.rating || 0} onPick={setRating} size="h-7 w-7" />
          <Textarea maxLength={1000} placeholder="اكتب رأيك (اختياري)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <Button disabled={busy || !rating} onClick={submit}>{busy ? "جارٍ الحفظ…" : "أَرْسِلْ تَقْيِيمَك"}</Button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground"><Link to="/auth" className="text-teal hover:underline">سَجِّلِ الدُّخُول</Link> لتضيف تقييمك.</p>
      )}
      <ul className="mt-6 space-y-4">
        {list.data?.map((r) => (
          <li key={r.id} className="border-b border-border pb-4 last:border-0">
            <div className="flex items-center justify-between gap-2"><span className="font-medium">{r.reviewer_name || "طالب"}</span><Stars value={r.rating} size="h-4 w-4" /></div>
            {r.comment && <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">{r.comment}</p>}
          </li>
        ))}
        {list.data && !list.data.length && <li className="text-sm text-muted-foreground">لا توجد تقييمات بعد. كن أول من يقيّم!</li>}
      </ul>
    </section>
  );
}

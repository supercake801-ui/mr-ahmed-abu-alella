import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { KeyRound, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth, PasswordInput } from "@/components/require-auth";
import { EmptyState } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPlaybackUrl } from "@/lib/platform.functions";
import { errMsg } from "@/lib/data";
import { VideoPlayer } from "@/components/video-player";

export const Route = createFileRoute("/watch/$videoId")({
  head: () => ({
    meta: [
      { title: "مشاهدة الفيديو | أسد التاريخ" },
      { name: "description", content: "مشاهدة دروس أ. أحمد أبو العلا على منصة أسد التاريخ." },
      { property: "og:title", content: "مشاهدة الفيديو | أسد التاريخ" },
      { property: "og:description", content: "مشاهدة دروس أ. أحمد أبو العلا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Watch />
    </RequireAuth>
  ),
});

function Watch() {
  const { videoId } = Route.useParams();
  const meta = useQuery({
    queryKey: ["watch-meta", videoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("videos").select("id,title,description,course_id,has_password").eq("id", videoId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [state, setState] = useState<"idle" | "loading" | "need_pw" | "wrong_pw" | "ready" | "error" | "unavailable">("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const pwRef = useRef<string | undefined>(undefined);
  const resumeAt = useRef(0);

  async function request(password?: string) {
    setState("loading");
    try {
      const r = await getPlaybackUrl({ data: { videoId, password } });
      if (r.ok) {
        pwRef.current = password;
        setUrl(r.url);
        setState("ready");
      } else if (r.reason === "password_required") setState("need_pw");
      else if (r.reason === "wrong_password") setState("wrong_pw");
      else setState("unavailable");
    } catch (e) {
      setMsg(errMsg(e));
      setState("error");
    }
  }

  useEffect(() => {
    if (meta.data && state === "idle") request();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.data]);

  function onVideoError(time: number) {
    resumeAt.current = time;
    setMsg("انقطع التشغيل أو انتهت صلاحية رابط المشاهدة المؤقت.");
    setState("error");
  }

  if (meta.isLoading) return <div className="mx-auto max-w-5xl px-4 py-10"><Skeleton className="aspect-video rounded-xl" /></div>;
  if (!meta.data) return <div className="mx-auto max-w-5xl px-4 py-10"><EmptyState text="الفيديو غير متاح لك، أو تم إلغاء نشره." /></div>;
  const v = meta.data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/courses/$courseId" params={{ courseId: v.course_id }} className="text-sm text-teal hover:underline">← العودة إلى المقرر</Link>
      <h1 className="mt-2 font-display text-2xl text-navy md:text-3xl">{v.title}</h1>
      <div className="mt-4 overflow-hidden rounded-xl bg-navy">
        {state === "ready" && url ? (
          <VideoPlayer src={url} initialTime={resumeAt.current} onError={onVideoError} />
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 p-6 text-center text-navy-foreground">
            {(state === "loading" || state === "idle") && <p>جارٍ التحقق من صلاحية المشاهدة…</p>}
            {(state === "need_pw" || state === "wrong_pw") && (
              <form className="flex w-full max-w-sm flex-col gap-3" onSubmit={(e) => { e.preventDefault(); request(pw); }}>
                <KeyRound className="mx-auto h-8 w-8 text-gold" />
                <p>هذا الفيديو محمي بكلمة مرور من المدرس.</p>
                <PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} placeholder="كلمة مرور الفيديو" aria-label="كلمة مرور الفيديو" autoComplete="off" maxLength={100} className="border-navy-foreground/30 bg-navy-foreground/10 text-navy-foreground placeholder:text-navy-foreground/50" />
                {state === "wrong_pw" && <p role="alert" className="text-sm text-gold">كلمة المرور غير صحيحة.</p>}
                <Button type="submit" disabled={!pw}>متابعة</Button>
              </form>
            )}
            {state === "unavailable" && <p>الفيديو غير متاح حاليًا.</p>}
            {state === "error" && (
              <>
                <p>{msg || "تعذر تشغيل الفيديو."}</p>
                <Button variant="secondary" onClick={() => request(pwRef.current)}><RotateCcw className="h-4 w-4" /> إعادة المحاولة</Button>
              </>
            )}
          </div>
        )}
      </div>
      {v.description && (
        <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-display text-xl text-navy">وَصْفُ الدَّرْس</h2>
          <p className="whitespace-pre-line text-lg leading-loose text-foreground/85">{v.description}</p>
        </section>
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseCover } from "@/components/course-card";
import { EmptyState } from "@/components/site-shell";
import { formatDuration } from "@/lib/data";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/courses/$courseId")({
  head: () => ({
    meta: [
      { title: "تفاصيل المقرر | أسد التاريخ" },
      { name: "description", content: "فيديوهات المقرر على منصة أسد التاريخ." },
      { property: "og:title", content: "تفاصيل المقرر | أسد التاريخ" },
      { property: "og:description", content: "فيديوهات المقرر مع أ. أحمد أبو العلا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoursePage,
});

function CoursePage() {
  const { courseId } = Route.useParams();
  const { session, loading } = useAuth();
  const course = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const videos = useQuery({
    queryKey: ["course-videos", courseId, session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("id, title, description, duration_seconds, status")
        .eq("course_id", courseId)
        .eq("status", "published")
        .order("published_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  if (course.isLoading) return <div className="mx-auto max-w-5xl px-4 py-10"><Skeleton className="h-64 rounded-xl" /></div>;
  if (!course.data) return <div className="mx-auto max-w-5xl px-4 py-10"><EmptyState text="المقرر غير موجود أو غير منشور." /></div>;
  const c = course.data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid gap-6 md:grid-cols-[2fr_3fr]">
        <div className="aspect-video overflow-hidden rounded-xl"><CourseCover course={c} /></div>
        <div>
          <h1 className="font-display text-3xl text-navy">{c.title}</h1>
          <p className="mt-3 whitespace-pre-line text-muted-foreground">{c.description}</p>
        </div>
      </div>
      <h2 className="mb-4 mt-10 font-display text-2xl text-navy">الفيديوهات</h2>
      {!loading && !session ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 text-center">
          <Lock className="h-8 w-8 text-gold" />
          <p>سجّل الدخول لمشاهدة فيديوهات هذا المقرر.</p>
          <div className="flex gap-2">
            <Button asChild><Link to="/auth" search={{ mode: "signin" }}>دخول</Link></Button>
            <Button asChild variant="outline"><Link to="/auth" search={{ mode: "signup" }}>إنشاء حساب</Link></Button>
          </div>
        </div>
      ) : videos.isLoading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : videos.data?.length ? (
        <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {videos.data.map((v, i) => (
            <li key={v.id}>
              <Link to="/watch/$videoId" params={{ videoId: v.id }} className="media-card-link flex items-center gap-4 p-4 transition-colors">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-sm text-navy-foreground">{i + 1}</span>
                <span className="flex-1">
                  <span className="block font-medium">{v.title}</span>
                  {v.description && <span className="line-clamp-1 text-sm text-muted-foreground">{v.description}</span>}
                </span>
                <span className="text-sm text-muted-foreground">{formatDuration(v.duration_seconds)}</span>
                <PlayCircle className="h-6 w-6 text-teal" />
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState text="لا توجد فيديوهات منشورة في هذا المقرر بعد، أو أن حسابك موقوف." />
      )}
    </div>
  );
}

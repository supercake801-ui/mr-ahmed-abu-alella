import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { KeyRound, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/require-auth";
import { PageTitle, EmptyState } from "@/components/site-shell";
import { CourseCover } from "@/components/course-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyProfile } from "@/lib/auth";
import { formatDuration } from "@/lib/data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة الطالب | أسد التاريخ" },
      { name: "description", content: "المقررات والفيديوهات المتاحة لك على منصة أسد التاريخ." },
      { property: "og:title", content: "لوحة الطالب | أسد التاريخ" },
      { property: "og:description", content: "المقررات والفيديوهات المتاحة لك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  ),
});

function Dashboard() {
  const profile = useMyProfile();
  const q = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [c, v] = await Promise.all([
        supabase.from("courses").select("id,title,description,cover_path,cover_url").eq("is_published", true).order("sort_order").limit(100),
        supabase.from("videos").select("id,title,course_id,duration_seconds,has_password,published_at").eq("status", "published").order("published_at").limit(500),
      ]);
      if (c.error) throw c.error;
      if (v.error) throw v.error;
      return { courses: c.data, videos: v.data };
    },
  });
  const inactive = profile.data && !profile.data.is_active;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageTitle title={`أهلًا${profile.data?.full_name ? "، " + profile.data.full_name : ""}`} subtitle="المقررات والفيديوهات المتاحة لك" />
      {inactive && <p className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">حسابك موقوف حاليًا، لذلك لا يمكنك مشاهدة الفيديوهات. تواصل مع الإدارة.</p>}
      {q.isLoading ? <Skeleton className="h-64 rounded-xl" /> : q.error ? <EmptyState text="تعذر تحميل المحتوى. أعد تحميل الصفحة." /> : !q.data?.courses.length ? <EmptyState text="لا توجد مقررات منشورة بعد." /> : (
        <div className="space-y-8">
          {q.data.courses.map((c) => {
            const vids = q.data.videos.filter((v) => v.course_id === c.id);
            return (
              <section key={c.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-center gap-4 border-b border-border p-4">
                  <div className="h-16 w-28 shrink-0 overflow-hidden rounded-md"><CourseCover course={c} /></div>
                  <div className="flex-1">
                    <Link to="/courses/$courseId" params={{ courseId: c.id }} className="font-display text-xl text-navy hover:underline">{c.title}</Link>
                    <p className="text-sm text-muted-foreground">{vids.length} فيديو</p>
                  </div>
                </div>
                {vids.length ? (
                  <ul className="divide-y divide-border">
                    {vids.map((v) => (
                      <li key={v.id}>
                        <Link to="/watch/$videoId" params={{ videoId: v.id }} className="flex items-center gap-3 p-3 hover:bg-accent">
                          <PlayCircle className="h-5 w-5 text-teal" />
                          <span className="flex-1">{v.title}</span>
                          {v.has_password && <span className="flex items-center gap-1 text-xs text-gold"><KeyRound className="h-3 w-3" /> بكلمة مرور</span>}
                          <span className="text-sm text-muted-foreground">{formatDuration(v.duration_seconds)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : <p className="p-4 text-sm text-muted-foreground">لا توجد فيديوهات متاحة في هذا المقرر بعد.</p>}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

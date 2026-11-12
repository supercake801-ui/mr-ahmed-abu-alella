import themeArt from "@/assets/muhammad-ali-theme.png.asset.json";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Globe2, Landmark, PlayCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseCard } from "@/components/course-card";
import { EmptyState } from "@/components/site-shell";
import { useCourses, useTeacherPhoto, useTeacherProfile } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { TeacherReviews } from "@/components/teacher-reviews";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "أسد التاريخ | منصة أ. أحمد أبو العلا للدراسات الاجتماعية" },
      { name: "description", content: "تعلّم التاريخ والجغرافيا مع أسد التاريخ أ. أحمد أبو العلا عبر شروحات فيديو منظمة." },
      { property: "og:title", content: "أسد التاريخ | أ. أحمد أبو العلا" },
      { property: "og:description", content: "شروحات فيديو منظمة في التاريخ والجغرافيا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { session } = useAuth();
  const teacher = useTeacherProfile();
  const photo = useTeacherPhoto().url;
  const courses = useCourses(1);

  return (
    <>
      <section className="relative overflow-hidden bg-[image:var(--gradient-hero)] text-navy-foreground">
        <img src={themeArt.url} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top opacity-20" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="mb-3 inline-block rounded-full bg-gold/20 px-3 py-1 text-sm text-gold">الدراسات الاجتماعية — تاريخ وجغرافيا</p>
            <h1 className="font-display text-4xl leading-tight md:text-5xl">
              ذاكر التاريخ مع <span className="text-gold">أسد التاريخ</span>
            </h1>
            <p className="mt-4 max-w-lg text-lg text-navy-foreground/80">
              شروحات فيديو واضحة ومنظمة مع أ. {teacher.data?.display_name ?? "أحمد أبو العلا"}، تساعدك تفهم وتحفظ وتتفوق.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90">
                {session ? <Link to="/dashboard">اُدْخُلْ لَوْحَتَك</Link> : <Link to="/auth" search={{ mode: "signup" }}>اِبْدَأِ الآنَ مَجَّانًا</Link>}
              </Button>
              <Button asChild size="lg" variant="outline" className="border-navy-foreground/40 bg-transparent text-navy-foreground hover:bg-navy-foreground/10">
                <a href="#courses">تَصَفَّحِ المُقَرَّرَات</a>
              </Button>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-3 rounded-full bg-[image:var(--gradient-gold)] opacity-70 blur-xl" />
              {photo ? (
                <img src={photo} alt="أ. أحمد أبو العلا" className="relative h-64 w-64 rounded-full border-4 border-gold object-cover md:h-80 md:w-80" />
              ) : (
                <div className="relative h-64 w-64 rounded-full border-4 border-gold bg-navy md:h-80 md:w-80" aria-hidden />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { i: Landmark, t: "التاريخ", d: "أحداث وشخصيات مرتبة زمنيًا" },
          { i: Globe2, t: "الجغرافيا", d: "خرائط ومفاهيم مبسطة" },
          { i: PlayCircle, t: "فيديوهات منظمة", d: "مقسمة حسب المقرر" },
          { i: ShieldCheck, t: "حساب آمن", d: "محتوى متاح للطلاب المسجلين" },
        ].map(({ i: Icon, t, d }) => (
          <div key={t} className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <Icon className="h-8 w-8 text-teal" />
            <h2 className="mt-3 font-display text-lg text-navy">{t}</h2>
            <p className="text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>

      <section id="courses" className="mx-auto max-w-6xl scroll-mt-24 px-4">
        <h2 className="mb-6 font-display text-2xl text-navy">أحدث المقررات</h2>
        {courses.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((k) => <Skeleton key={k} className="aspect-video rounded-xl" />)}</div>
        ) : courses.data?.rows.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.data.rows.slice(0, 6).map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        ) : (
          <EmptyState text="لا توجد مقررات منشورة بعد." />
        )}
      </section>
      <div className="mx-auto max-w-6xl px-4 py-12"><TeacherReviews limit={6} /></div>
    </>
  );
}

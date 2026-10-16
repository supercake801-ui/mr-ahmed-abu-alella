import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeacherPhoto, useTeacherProfile } from "@/lib/data";

export const Route = createFileRoute("/teacher")({
  head: () => ({
    meta: [
      { title: "أ. أحمد أبو العلا — أسد التاريخ" },
      { name: "description", content: "تعرّف على أ. أحمد أبو العلا، أسد التاريخ، مدرس الدراسات الاجتماعية." },
      { property: "og:title", content: "أ. أحمد أبو العلا — أسد التاريخ" },
      { property: "og:description", content: "مدرس الدراسات الاجتماعية: التاريخ والجغرافيا." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeacherPage,
});

function TeacherPage() {
  const { data, isLoading } = useTeacherProfile();
  const photo = useTeacherPhoto().url;
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="grid items-center gap-8 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-10 md:grid-cols-[280px_1fr]">
        <div className="mx-auto w-full max-w-[280px]">
          <div className="relative">
            <div className="absolute -inset-2 rounded-2xl bg-[image:var(--gradient-gold)] opacity-50 blur-lg" />
            {photo ? (
              <img src={photo} alt="أ. أحمد أبو العلا" className="relative aspect-square w-full rounded-2xl border-4 border-gold object-cover" />
            ) : (
              <div className="relative aspect-square w-full rounded-2xl border-4 border-gold bg-navy" aria-hidden />
            )}
          </div>
        </div>
        <div className="text-center md:text-start">
          {isLoading ? (
            <div className="space-y-3"><Skeleton className="h-10 w-60" /><Skeleton className="h-6 w-40" /><Skeleton className="h-24 w-full" /></div>
          ) : (
            <>
              <h1 className="font-display text-3xl text-navy md:text-4xl">{data?.display_name ?? "أحمد أبو العلا"}</h1>
              <p className="mt-2 text-lg font-semibold text-gold">{data?.tagline ?? "أسد التاريخ"}</p>
              <p className="mt-1 text-muted-foreground">مدرس الدراسات الاجتماعية — التاريخ والجغرافيا</p>
              <p className="mx-auto mt-6 max-w-prose whitespace-pre-line leading-8 md:mx-0">{data?.bio || "نبذة المدرس ستُضاف قريبًا."}</p>
            </>
          )}
          <Button asChild className="mt-8"><Link to="/courses">شاهد المقررات</Link></Button>
        </div>
      </div>
    </div>
  );
}

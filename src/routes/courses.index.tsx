import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseCard, Pager } from "@/components/course-card";
import { EmptyState, PageTitle } from "@/components/site-shell";
import { PAGE_SIZE, useCourses } from "@/lib/data";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "المقررات | أسد التاريخ" },
      { name: "description", content: "جميع مقررات التاريخ والجغرافيا على منصة أسد التاريخ." },
      { property: "og:title", content: "المقررات | أسد التاريخ" },
      { property: "og:description", content: "مقررات التاريخ والجغرافيا مع أ. أحمد أبو العلا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useCourses(page);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageTitle title="المقررات" subtitle="اختر المقرر لمشاهدة فيديوهاته" />
      {error ? (
        <EmptyState text="تعذر تحميل المقررات. حاول مرة أخرى." />
      ) : isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((k) => <Skeleton key={k} className="aspect-video rounded-xl" />)}</div>
      ) : data?.rows.length ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.rows.map((c) => <CourseCard key={c.id} course={c} />)}</div>
          <Pager page={page} total={data.total} size={PAGE_SIZE} onChange={setPage} />
        </>
      ) : (
        <EmptyState text="لا توجد مقررات منشورة بعد." />
      )}
    </div>
  );
}

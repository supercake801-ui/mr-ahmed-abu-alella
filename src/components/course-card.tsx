import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { useMediaUrl } from "@/lib/data";

type Course = { id: string; title: string; description: string; cover_path: string | null; cover_url: string | null };

export function CourseCover({ course, className = "" }: { course: Pick<Course, "cover_path" | "cover_url" | "title">; className?: string }) {
  const { data: url } = useMediaUrl(course.cover_path ?? course.cover_url);
  return url ? (
    <div className={`flex h-full w-full items-center justify-center bg-navy ${className}`}>
      <img src={url} alt={course.title} loading="lazy" className="h-full w-full object-contain" />
    </div>
  ) : (
    <div className={`flex h-full w-full items-center justify-center bg-navy text-gold ${className}`}>
      <BookOpen className="h-10 w-10" />
    </div>
  );
}

export function CourseCard({ course }: { course: Course }) {
  return (
    <Link
      to="/courses/$courseId"
      params={{ courseId: course.id }}
      className="group overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="aspect-video overflow-hidden">
        <CourseCover course={course} className="transition-transform group-hover:scale-105 motion-reduce:transition-none" />
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg text-navy">{course.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{course.description || "—"}</p>
      </div>
    </Link>
  );
}

export function Pager({ page, total, size, onChange }: { page: number; total: number; size: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  return (
    <div className="mt-8 flex items-center justify-center gap-3">
      <button className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-40" disabled={page <= 1} onClick={() => onChange(page - 1)}>السابق</button>
      <span className="text-sm text-muted-foreground">صفحة {page} من {pages}</span>
      <button className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-40" disabled={page >= pages} onClick={() => onChange(page + 1)}>التالي</button>
    </div>
  );
}

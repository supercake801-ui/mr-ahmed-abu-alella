import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMediaUrl, getOwnMediaUrl } from "@/lib/platform.functions";
import teacherPhoto from "@/assets/ahmed-abulela.jpg.asset.json";

export const PAGE_SIZE = 12;

export const DEFAULT_TEACHER_PHOTO = teacherPhoto.url;

/** Resolve an image stored either as full URL or as a path in the "media" bucket. */
export function useMediaUrl(pathOrUrl: string | null | undefined) {
  return useQuery({
    queryKey: ["media-url", pathOrUrl],
    enabled: !!pathOrUrl,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      if (/^(https?:|\/)/.test(pathOrUrl!)) return pathOrUrl!;
      const path = pathOrUrl!;
      // Published images are handed out by the server to anyone; a private file
      // (an unpublished cover, a draft thumbnail) only comes back to its owner or staff.
      try {
        return await getMediaUrl({ data: { path } });
      } catch {
        return await getOwnMediaUrl({ data: { path } });
      }
    },
  });
}

export function useTeacherProfile() {
  return useQuery({
    queryKey: ["teacher-profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teacher_profile").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Teacher photo without flicker: the bundled default only shows when the
 * profile has NO uploaded photo; while an uploaded photo's URL is being
 * resolved, `url` stays undefined so the old image never flashes.
 */
export function useTeacherPhoto() {
  const profile = useTeacherProfile();
  const path = profile.data?.photo_url;
  const resolved = useMediaUrl(path);
  if (!path) return { url: profile.data ? DEFAULT_TEACHER_PHOTO : undefined, loading: profile.isLoading };
  return { url: resolved.data, loading: resolved.isLoading };
}

export function useCourses(page: number, opts: { all?: boolean } = {}) {
  return useQuery({
    queryKey: ["courses", page, !!opts.all],
    queryFn: async () => {
      let q = supabase
        .from("courses")
        .select("*", { count: "exact" })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (!opts.all) q = q.eq("is_published", true);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data, total: count ?? 0 };
    },
  });
}

export const STATUS_LABEL: Record<string, string> = {
  uploading: "رفع جارٍ",
  draft: "مسودة",
  published: "منشور",
  failed: "فشل الرفع",
};

export function formatDuration(s: number | null | undefined) {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "حدث خطأ غير متوقع";
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const IMAGE_MAX = 5 * 1024 * 1024;
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];
export const VIDEO_MAX = 5 * 1024 * 1024 * 1024;

export function validateImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return "نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WebP.";
  if (file.size > IMAGE_MAX) return "حجم الصورة أكبر من 5 ميجابايت.";
  return null;
}

export function validateVideo(file: File): string | null {
  if (!VIDEO_TYPES.includes(file.type)) return "نوع الفيديو غير مدعوم. استخدم MP4 أو WebM أو MOV.";
  if (file.size > VIDEO_MAX) return "حجم الفيديو أكبر من 5 جيجابايت.";
  if (file.size === 0) return "الملف فارغ.";
  return null;
}

export function extOf(file: File) {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-m4v": "m4v",
  };
  return map[file.type] ?? "bin";
}

export function formatBytes(n: number | null | undefined) {
  if (!n) return "—";
  const u = ["بايت", "ك.ب", "م.ب", "ج.ب"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i ? 1 : 0)} ${u[i]}`;
}

/** Upload an image to a private bucket and return its storage path. */
export async function uploadImage(bucket: "media" | "avatars", path: string, file: File) {
  const err = validateImage(file);
  if (err) throw new Error(err);
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: true,
    cacheControl: "3600",
  });
  if (error) throw new Error("فشل رفع الصورة: " + error.message);
  return path;
}

/** Signed (temporary) URL for an image stored in a private bucket. */
export function useSignedUrl(bucket: "media" | "avatars", path: string | null | undefined) {
  return useQuery({
    queryKey: ["signed", bucket, path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

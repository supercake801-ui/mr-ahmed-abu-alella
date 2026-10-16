import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";

export type UploadHandle = { upload: tus.Upload; start: () => void; pause: () => Promise<void> };

/** Resumable (TUS) upload to a Storage bucket in 6MB chunks. */
export async function createResumableUpload(opts: {
  bucket: string;
  path: string;
  file: File;
  onProgress: (sent: number, total: number) => void;
  onSuccess: () => void;
  onError: (e: Error) => void;
}): Promise<UploadHandle> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("يجب تسجيل الدخول");
  const base = import.meta.env['VITE_SUPABASE_URL'] as string;
  const upload = new tus.Upload(opts.file, {
    endpoint: `${base}/storage/v1/upload/resumable`,
    retryDelays: [0, 2000, 5000, 10000, 20000, 30000],
    headers: {
      authorization: `Bearer ${token}`,
      apikey: import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] as string,
      "x-upsert": "true",
    },
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    metadata: {
      bucketName: opts.bucket,
      objectName: opts.path,
      contentType: opts.file.type,
      cacheControl: "3600",
    },
    chunkSize: 6 * 1024 * 1024,
    onProgress: opts.onProgress,
    onSuccess: opts.onSuccess,
    onError: (e) => opts.onError(e instanceof Error ? e : new Error(String(e))),
  });
  return {
    upload,
    start: () => {
      upload.findPreviousUploads().then((prev) => {
        if (prev[0]) upload.resumeFromPreviousUpload(prev[0]);
        upload.start();
      });
    },
    pause: () => upload.abort(),
  };
}

export function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    const url = URL.createObjectURL(file);
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(v.duration) ? Math.round(v.duration) : null);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    v.src = url;
  });
}

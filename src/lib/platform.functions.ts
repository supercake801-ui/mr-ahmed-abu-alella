import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function assertStaff(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("is_staff", { _user_id: ctx.userId });
  if (!data) throw new Error("غير مصرح لك بهذه العملية");
}
async function assertAdmin(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("هذه العملية للإدارة فقط");
}

const uuid = z.string().uuid();

/** Staff may manage only their own videos; admins may manage all. */
async function assertCanManageVideo(ctx: Ctx, videoId: string) {
  await assertStaff(ctx);
  const { data: v } = await ctx.supabase.from("videos").select("owner_id").eq("id", videoId).maybeSingle();
  if (!v) throw new Error("الفيديو غير موجود");
  if (v.owner_id === ctx.userId) return;
  const { data: admin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!admin) throw new Error("لا تملك صلاحية إدارة هذا الفيديو");
}

/* ---------------- Videos ---------------- */

export const finalizeVideoUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ videoId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanManageVideo(context, data.videoId);
    const { data: v, error } = await context.supabase
      .from("videos")
      .select("id, video_path, size_bytes, status")
      .eq("id", data.videoId)
      .single();
    if (error || !v) throw new Error("الفيديو غير موجود");
    if (!v.video_path) throw new Error("لا يوجد ملف مرتبط بالفيديو");
    const slash = v.video_path.lastIndexOf("/");
    const folder = v.video_path.slice(0, slash);
    const name = v.video_path.slice(slash + 1);
    const { data: files, error: lErr } = await context.supabase.storage
      .from("videos")
      .list(folder, { search: name, limit: 5 });
    if (lErr) throw new Error("تعذر التحقق من الملف: " + lErr.message);
    const f = (files ?? []).find((x: any) => x.name === name);
    const size = Number(f?.metadata?.size ?? 0);
    if (!f || (v.size_bytes && size !== Number(v.size_bytes))) {
      await context.supabase.from("videos").update({ status: "failed" }).eq("id", v.id);
      return { ok: false as const, message: "لم يكتمل الملف على الخادم. أعد المحاولة." };
    }
    const nextStatus = v.status === "published" ? "published" : "draft";
    await context.supabase.from("videos").update({ status: nextStatus, size_bytes: size }).eq("id", v.id);
    return { ok: true as const };
  });

export const setVideoPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ videoId: uuid, publish: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanManageVideo(context, data.videoId);
    const { data: v } = await context.supabase
      .from("videos")
      .select("id, status, video_path")
      .eq("id", data.videoId)
      .single();
    if (!v) throw new Error("الفيديو غير موجود");
    if (data.publish && !(v.status === "draft" || v.status === "published"))
      throw new Error("لا يمكن نشر فيديو لم يكتمل رفعه");
    const { error } = await context.supabase
      .from("videos")
      .update(
        data.publish
          ? { status: "published", published_at: new Date().toISOString() }
          : { status: "draft" },
      )
      .eq("id", v.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ videoId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanManageVideo(context, data.videoId);
    const { data: v } = await context.supabase
      .from("videos")
      .select("id, video_path, thumbnail_path")
      .eq("id", data.videoId)
      .single();
    if (!v) throw new Error("الفيديو غير موجود");
    // remove the whole folder for this video (covers partial uploads too)
    const { data: files } = await context.supabase.storage.from("videos").list(v.id);
    const paths = (files ?? []).map((f: any) => `${v.id}/${f.name}`);
    if (paths.length) {
      const { error } = await context.supabase.storage.from("videos").remove(paths);
      if (error) throw new Error("تعذر حذف ملف الفيديو: " + error.message);
    }
    if (v.thumbnail_path) await context.supabase.storage.from("media").remove([v.thumbnail_path]);
    const { error } = await context.supabase.from("videos").delete().eq("id", v.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setVideoPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      videoId: uuid,
      password: z.string().min(4).max(100).nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanManageVideo(context, data.videoId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).rpc("set_video_password", {
      _video_id: data.videoId,
      _password: data.password,
    });
    if (error) throw new Error("تعذر حفظ كلمة مرور الفيديو");
    return { ok: true };
  });

/** Lets the teacher/admin managing a video see its current shared password. */
export const getVideoPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ videoId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanManageVideo(context, data.videoId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await (supabaseAdmin as any)
      .from("video_secrets").select("password_plain").eq("video_id", data.videoId).maybeSingle();
    return { password: (s?.password_plain as string | null) ?? null };
  });

/** Short TTL so revoking access / changing a password takes effect quickly. */
const PLAYBACK_TTL = 60 * 30;

export const getPlaybackUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ videoId: uuid, password: z.string().max(100).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // RLS decides whether this user may see the video at all (published, active user, published course).
    const { data: v } = await context.supabase
      .from("videos")
      .select("id, video_path, status, has_password, quality_paths, captions_vtt")
      .eq("id", data.videoId)
      .maybeSingle();
    if (!v || !v.video_path || v.status === "uploading" || v.status === "failed")
      return { ok: false as const, reason: "unavailable" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (v.has_password && !staff) {
      if (!data.password) return { ok: false as const, reason: "password_required" as const };
      const { data: good } = await (supabaseAdmin as any).rpc("check_video_password", {
        _video_id: v.id,
        _password: data.password,
      });
      if (!good) return { ok: false as const, reason: "wrong_password" as const };
    }
    const { data: s, error } = await supabaseAdmin.storage
      .from("videos")
      .createSignedUrl(v.video_path, PLAYBACK_TTL);
    if (error || !s) throw new Error("تعذر تجهيز رابط المشاهدة");
    const qualities = await Promise.all(Object.entries((v.quality_paths ?? {}) as Record<string, string>).map(async ([height, path]) => {
      if (!['480','720','1080'].includes(height) || !path.startsWith(`${v.id}/`)) return null;
      const { data: signed } = await supabaseAdmin.storage.from('videos').createSignedUrl(path, PLAYBACK_TTL);
      return signed ? { label: `${height}p`, height: Number(height), url: signed.signedUrl } : null;
    }));
    return { ok: true as const, url: s.signedUrl, qualities: qualities.filter(q => q !== null), captionsVtt: v.captions_vtt, expiresIn: PLAYBACK_TTL };
  });

/* ---------------- Account ---------------- */

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ password: z.string().min(1).max(200), confirm: z.literal("احذف حسابي") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const email = (context as any).claims?.email as string | undefined;
    if (!email) throw new Error("تعذر التحقق من الحساب");
    // Re-verify identity with the password
    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const verifier = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: signIn, error: pwErr } = await verifier.auth.signInWithPassword({
      email,
      password: data.password,
    });
    if (pwErr || signIn.user?.id !== context.userId) throw new Error("كلمة المرور غير صحيحة");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin) {
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) throw new Error("لا يمكن حذف آخر حساب إدارة. امنح الإدارة لحساب آخر أولًا.");
    }
    // Remove private avatar files
    const { data: files } = await supabaseAdmin.storage.from("avatars").list(context.userId);
    const paths = (files ?? []).map((f) => `${context.userId}/${f.name}`);
    if (paths.length) await supabaseAdmin.storage.from("avatars").remove(paths);
    // Content owned by staff stays with the platform: reassign to nobody is not needed (owner_id is plain uuid).
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error("تعذر حذف الحساب: " + error.message);
    return { ok: true };
  });

/* ---------------- Admin ---------------- */

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ page: z.number().int().min(1).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const perPage = 20;
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page: data.page, perPage });
    if (error) throw new Error(error.message);
    const ids = list.users.map((u) => u.id);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, is_active").in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
    ]);
    return {
      hasMore: list.users.length === perPage,
      users: list.users.map((u) => ({
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        full_name: profiles?.find((p) => p.id === u.id)?.full_name ?? "",
        is_active: profiles?.find((p) => p.id === u.id)?.is_active ?? true,
        roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role as string),
      })),
    };
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: uuid, role: z.enum(["admin", "teacher"]), grant: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Admin can be taken back at any time and granted again later, but the platform
    // must never be left without an admin account.
    if (!data.grant && data.role === "admin") {
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1)
        throw new Error("لا يمكن سحب الإدارة من آخر حساب إدارة. امنح الإدارة لحساب آخر أولًا.");
    }
    const q = data.grant
      ? supabaseAdmin.from("user_roles").upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" })
      : supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: uuid, active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("لا يمكنك إيقاف حسابك");
    const { error } = await context.supabase
      .from("profiles")
      .update({ is_active: data.active })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const c = (t: "profiles" | "courses" | "videos") =>
      supabaseAdmin.from(t).select("id", { count: "exact", head: true });
    const [u, co, vi, pub] = await Promise.all([
      c("profiles"), c("courses"), c("videos"),
      supabaseAdmin.from("videos").select("id", { count: "exact", head: true }).eq("status", "published"),
    ]);
    return { users: u.count ?? 0, courses: co.count ?? 0, videos: vi.count ?? 0, published: pub.count ?? 0 };
  });

/* ---------------- Image links ---------------- */

const MEDIA_TTL = 3600;
const mediaPath = z.object({ path: z.string().min(1).max(500) });

/**
 * Signed URL for an image that is already public content: a published course cover,
 * a published video thumbnail, or the teacher's own photo. The file itself stays in a
 * private bucket that only its owner or staff can read, so nothing else is ever handed out.
 */
export const getMediaUrl = createServerFn({ method: "POST" })
  .inputValidator((d) => mediaPath.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: covers }, { data: photos }] = await Promise.all([
      supabaseAdmin.from("courses").select("id").eq("cover_path", data.path).eq("is_published", true).limit(1),
      supabaseAdmin.from("teacher_profile").select("id").eq("photo_url", data.path).limit(1),
    ]);
    let thumbOk = false;
    if (!covers?.length && !photos?.length) {
      const { data: vid } = await supabaseAdmin
        .from("videos")
        .select("id, course_id")
        .eq("thumbnail_path", data.path)
        .eq("status", "published")
        .limit(1)
        .maybeSingle();
      if (vid) {
        const { data: c } = await supabaseAdmin
          .from("courses")
          .select("id")
          .eq("id", vid.course_id)
          .eq("is_published", true)
          .limit(1);
        thumbOk = !!c?.length;
      }
    }
    if (!covers?.length && !photos?.length && !thumbOk) throw new Error("هذه الصورة غير متاحة");
    const { data: s, error } = await supabaseAdmin.storage.from("media").createSignedUrl(data.path, MEDIA_TTL);
    if (error || !s) throw new Error("تعذر تجهيز رابط الصورة");
    return s.signedUrl;
  });

/** Signed URL for a private image the caller is allowed to read (their own file, or staff). */
export const getOwnMediaUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => mediaPath.parse(d))
  .handler(async ({ data, context }) => {
    const { data: s, error } = await context.supabase.storage.from("media").createSignedUrl(data.path, MEDIA_TTL);
    if (error || !s) throw new Error("تعذر تجهيز رابط الصورة");
    return s.signedUrl;
  });

// app/lib/assignmentMedia.js
//
// 🆕 فيديو/أوديو في الواجبات (مرفق المدرّس في الواجب + تسليم الطالب) — كله
// متسجّل على Bunny:
//   - video → Bunny Stream (رابط الـ embed: https://iframe.mediadelivery.net/embed/<lib>/<videoId>)
//   - audio → Bunny Storage (رابط الـ Pull Zone)
//
// 🔒 SECURITY: الـ API ما بيقبلش أي رابط جاي من الـ client زي ما هو. بنتحقق
// إنه رابط Bunny بتاعنا فعلًا (نفس الـ library / نفس الـ Pull Zone) وبنخزّن
// النسخة الأصلية غير الموقّعة (الرابط الموقّع بينتهي بعد ساعات)، وبنوقّعه
// من جديد وقت الإرسال للعميل (resolveAssignmentMedia).

import {
  extractBunnyStreamVideoId,
  buildStreamPlaybackUrl,
  buildSecureStreamPlaybackUrl,
  extractBunnyStoragePath,
  buildStoragePublicUrl,
  resolveSecureStoredUrl,
} from "@/app/lib/bunny";

export const ASSIGNMENT_MEDIA_TYPES = ["video", "audio"];

/**
 * @param {unknown} rawUrl
 * @param {unknown} rawType
 * @param {{ audioFolderPrefix?: string }} [opts]
 *   audioFolderPrefix: لازم مسار ملف الأوديو (جوه الـ storage zone) يبدأ بيه،
 *   مثلاً "/edumaster/students/<id>/" عشان الطالب ميربطش ملف حد تاني بتسليمه.
 * @returns {{ ok: true, mediaUrl: string|null, mediaType: "video"|"audio"|null } | { ok: false, error: string }}
 */
export function sanitizeAssignmentMedia(rawUrl, rawType, { audioFolderPrefix = "/edumaster/" } = {}) {
  const url = typeof rawUrl === "string" ? rawUrl.trim() : "";
  if (!url) return { ok: true, mediaUrl: null, mediaType: null };

  if (!ASSIGNMENT_MEDIA_TYPES.includes(rawType)) return { ok: false, error: "invalid_media_type" };
  if (url.length > 2000) return { ok: false, error: "invalid_media_url" };

  if (rawType === "video") {
    const videoId = extractBunnyStreamVideoId(url);
    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
    const libraryMatch = url.match(/^https:\/\/iframe\.mediadelivery\.net\/embed\/(\d+)\//);
    if (!videoId || !libraryMatch || !libraryId || libraryMatch[1] !== String(libraryId)) {
      return { ok: false, error: "invalid_media_url" };
    }
    return { ok: true, mediaUrl: buildStreamPlaybackUrl(videoId), mediaType: "video" };
  }

  // audio → Bunny Storage (بنشيل أي ?token=...&expires=... قبل الفحص والتخزين)
  const path = extractBunnyStoragePath(url.split("?")[0]);
  if (!path || path.includes("..") || !path.startsWith(audioFolderPrefix)) {
    return { ok: false, error: "invalid_media_url" };
  }
  return { ok: true, mediaUrl: buildStoragePublicUrl(path.slice(1)), mediaType: "audio" };
}

/** رابط جاهز للعرض (موقّع لو Token Authentication مفعّل على Bunny). */
export function resolveAssignmentMedia(mediaUrl, mediaType) {
  if (!mediaUrl) return null;
  if (mediaType === "video") {
    const videoId = extractBunnyStreamVideoId(mediaUrl);
    return videoId ? buildSecureStreamPlaybackUrl(videoId) : mediaUrl;
  }
  return resolveSecureStoredUrl(mediaUrl);
}

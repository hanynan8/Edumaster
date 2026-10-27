// app/lib/lessonAudio.js
//
// 🆕 درس من نوع "audio": ملف صوتي (mp3/m4a/wav...) بيتخزّن على Bunny Storage
// (نفس مسار رفع الـ PDF/أوديو الواجبات: POST /api/upload/file { kind: "audio" })
// وبيتحفظ رابطه في lesson.fileUrl — فكل الـ routes اللي بتسرّب محتوى الدرس
// (resolveSecureLessonMediaUrls) بتوقّع رابطه تلقائيًا من غير أي تعديل.
//
// 🔒 SECURITY: الـ API ما بيقبلش أي رابط جاي من الـ client زي ما هو. بنتحقق إنه
// ملف على الـ Pull Zone بتاعنا تحت /edumaster/ (مفيش ".." ولا دومين تاني)،
// وبنشيل أي ?token=...&expires=... قبل التخزين — الرابط الموقّع بينتهي بعد
// ساعات، فبنخزّن الرابط الأصلي ونوقّعه من جديد وقت الإرسال للعميل.

import { sanitizeAssignmentMedia } from "@/app/lib/assignmentMedia";

/**
 * @param {unknown} rawUrl
 * @returns {{ ok: true, url: string } | { ok: false, error: "missing_audio_url" | "invalid_audio_url" }}
 */
export function sanitizeLessonAudioUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return { ok: false, error: "missing_audio_url" };
  }
  const res = sanitizeAssignmentMedia(rawUrl, "audio");
  if (!res.ok || !res.mediaUrl) return { ok: false, error: "invalid_audio_url" };
  return { ok: true, url: res.mediaUrl };
}

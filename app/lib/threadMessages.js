// app/lib/threadMessages.js
//
// 🆕 محادثة نصية (thread) بين الطالب والمدرّس/الموديريتر جوه الكويز (على محاولة الطالب)
// أو جوه الواجب (على تسليم الطالب). نفس المنطق للاتنين:
//   messages: [{ sender, senderRole, text, createdAt }]
//
// 🔒 senderRole بيتحدد سيرفر-سايد من الـ session — العميل مبيبعتش غير النص.
// 🔒 النص بيتقصّ على MAX_MESSAGE_LENGTH ومفيش HTML بيتنفّذ (React بيعمل escape).

import { canGradeCourse } from "@/app/lib/rbac";
import { sanitizeAssignmentMedia, resolveAssignmentMedia } from "@/app/lib/assignmentMedia";

export const MAX_MESSAGE_LENGTH = 20000; // نص كبير (إجابة مقالية / تعليق مطوّل)
export const MAX_MESSAGES_PER_THREAD = 500;

/** @returns {{ ok: true, text: string } | { ok: false, error: string }} */
export function sanitizeMessageText(raw) {
  const text = typeof raw === "string" ? raw.replace(/\r\n/g, "\n").trim() : "";
  if (!text) return { ok: false, error: "empty_message" };
  if (text.length > MAX_MESSAGE_LENGTH) return { ok: false, error: "message_too_long" };
  return { ok: true, text };
}

/**
 * مين يقدر يقرا/يكتب في الـ thread: صاحب الكورس/موديريتر/أدمن، أو الطالب صاحب المحاولة/التسليم.
 * @returns {"staff"|"student"|null}
 */
export function threadAccess(session, courseTeacherId, studentId) {
  // 🆕 المدرّس المشرف على الكورس بيتواصل مع الطالب ويصحّح (واجبات + كويزات).
  if (canGradeCourse(session, courseTeacherId)) return "staff";
  if (String(session.user.id) === String(studentId)) return "student";
  return null;
}

/**
 * 🆕 رد صوتي: بنقبل بس رابط أوديو من Bunny Storage تحت فولدر المرسل نفسه
 * (نفس مسار /api/upload/file: edumaster/students|teachers/<userId>/...)، فمفيش
 * حد يقدر يربط ملف حد تاني برسالته. الرابط بيتخزّن من غير token.
 * @returns {{ ok: true, audioUrl: string|null } | { ok: false, error: string }}
 */
export function sanitizeThreadAudio(rawUrl, { userId, role }) {
  const url = typeof rawUrl === "string" ? rawUrl.trim() : "";
  if (!url) return { ok: true, audioUrl: null };
  const roleFolder = role === "student" ? "students" : "teachers";
  const media = sanitizeAssignmentMedia(url, "audio", {
    audioFolderPrefix: `/edumaster/${roleFolder}/${userId}/`,
  });
  if (!media.ok) return { ok: false, error: "invalid_audio_url" };
  return { ok: true, audioUrl: media.mediaUrl };
}

export function serializeMessages(messages, nameById = {}) {
  return (messages || []).map((m) => ({
    id: m._id?.toString?.() ?? null,
    senderId: m.sender?.toString?.() ?? String(m.sender),
    senderName: nameById[String(m.sender)] || null,
    senderRole: m.senderRole,
    text: m.text || "",
    // موقّع من جديد وقت الإرسال (لو Token Authentication مفعّل على Bunny)
    audioUrl: m.audioUrl ? resolveAssignmentMedia(m.audioUrl, "audio") : null,
    createdAt: m.createdAt,
  }));
}

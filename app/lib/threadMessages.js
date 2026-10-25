// app/lib/threadMessages.js
//
// 🆕 محادثة نصية (thread) بين الطالب والمدرّس/الموديريتر جوه الكويز (على محاولة الطالب)
// أو جوه الواجب (على تسليم الطالب). نفس المنطق للاتنين:
//   messages: [{ sender, senderRole, text, createdAt }]
//
// 🔒 senderRole بيتحدد سيرفر-سايد من الـ session — العميل مبيبعتش غير النص.
// 🔒 النص بيتقصّ على MAX_MESSAGE_LENGTH ومفيش HTML بيتنفّذ (React بيعمل escape).

import { isOwnerOrStaff } from "@/app/lib/rbac";

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
  if (isOwnerOrStaff(session, courseTeacherId)) return "staff";
  if (String(session.user.id) === String(studentId)) return "student";
  return null;
}

export function serializeMessages(messages, nameById = {}) {
  return (messages || []).map((m) => ({
    id: m._id?.toString?.() ?? null,
    senderId: m.sender?.toString?.() ?? String(m.sender),
    senderName: nameById[String(m.sender)] || null,
    senderRole: m.senderRole,
    text: m.text,
    createdAt: m.createdAt,
  }));
}

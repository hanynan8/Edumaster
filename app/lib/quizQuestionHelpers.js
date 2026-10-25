// app/lib/quizQuestionHelpers.js
//
// 🆕 منطق مشترك لأسئلة الكويز (إنشاء/تعديل/عرض) — بيدعم 3 أنواع:
//   multiple_choice | true_false (تصحيح تلقائي) + essay (مقالي: تصحيح يدوي من المدرّس/الموديريتر)
// وبيدعم فيديو/أوديو مرفق بالسؤال (Bunny) بنفس تحقق الواجبات (assignmentMedia.js).

import { sanitizeAssignmentMedia, resolveAssignmentMedia } from "@/app/lib/assignmentMedia";

export const QUESTION_TYPES = ["multiple_choice", "true_false", "essay"];
export const AUTO_GRADED_TYPES = ["multiple_choice", "true_false"];
export const MAX_ESSAY_ANSWER_LENGTH = 20000;

// لـ essay مفيش خيارات خالص. باقي الأنواع: 2 خيار على الأقل، وخيار صح، ومفيش نص فاضي.
export function validateOptions(type, options) {
  if (type === "essay") return null;
  if (!Array.isArray(options) || options.length < 2) return "options_required";
  if (type === "true_false" && options.length !== 2) return "true_false_needs_two_options";
  if (options.some((o) => !String(o?.text || "").trim())) return "empty_option_text";
  if (!options.some((o) => Boolean(o?.isCorrect))) return "no_correct_option";
  if (type === "true_false" && options.filter((o) => o.isCorrect).length !== 1) {
    return "true_false_needs_one_correct";
  }
  return null;
}

export function normalizeOptions(rawOptions) {
  return (Array.isArray(rawOptions) ? rawOptions : []).map((o) => ({
    text: String(o?.text || "").trim(),
    isCorrect: Boolean(o?.isCorrect),
  }));
}

/** مرفق السؤال (فيديو/أوديو). الأوديو لازم يبقى تحت فولدر المستخدم اللي بيحفظ السؤال. */
export function sanitizeQuestionMedia(body, userId) {
  return sanitizeAssignmentMedia(body?.mediaUrl, body?.mediaType, {
    audioFolderPrefix: `/edumaster/`,
  });
}

export function serializeQuestion(qq, { forStudent = false } = {}) {
  const base = {
    id: qq._id.toString(),
    type: qq.type,
    text: qq.text,
    points: qq.points,
    order: qq.order,
    mediaUrl: resolveAssignmentMedia(qq.mediaUrl, qq.mediaType),
    mediaType: qq.mediaUrl ? qq.mediaType : null,
  };
  if (qq.type === "essay") return { ...base, options: [] };
  return {
    ...base,
    // 🔒 الطالب مبيشوفش isCorrect — التصحيح سيرفر-سايد بس
    options: (qq.options || []).map((o, index) =>
      forStudent ? { index, text: o.text } : { index, text: o.text, isCorrect: o.isCorrect }
    ),
  };
}

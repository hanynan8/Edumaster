// app/lib/auditLog.js
//
// دالة موحّدة لتسجيل أي إجراء إداري حساس. بتتنادى من الـ API routes بعد
// نجاح الإجراء فعليًا (مش قبل) عشان السجل يعكس الواقع بالظبط.

import { connectToMongo, getAuditLogModel } from "@/app/lib/mongodb";

function getClientIp(request) {
  const forwarded = request?.headers?.get?.("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request?.headers?.get?.("x-real-ip") || null;
}

/**
 * @param {object} params
 * @param {Request} params.request - الـ request الأصلي (لاستخراج IP/User-Agent)
 * @param {object} params.actor - session.user بتاع الأدمن اللي عمل الإجراء
 * @param {string} params.action - مثال: "user.role_changed"
 * @param {string} [params.targetId]
 * @param {string} [params.targetEmail]
 * @param {object} [params.details]
 */
export async function logAudit({
  request,
  actor,
  action,
  targetId = null,
  targetEmail = null,
  details = {},
}) {
  try {
    await connectToMongo();
    const AuditLog = getAuditLogModel();

    await AuditLog.create({
      action,
      actorId: actor?.id || null,
      actorEmail: actor?.email || null,
      actorName: actor?.name || null,
      targetId,
      targetEmail,
      details,
      ip: getClientIp(request),
      userAgent: request?.headers?.get?.("user-agent") || null,
    });
  } catch (err) {
    // 🔒 SECURITY: فشل تسجيل الـ audit log مايوقفش الإجراء الأساسي نفسه
    // (مثلاً حذف مستخدم لازم يكمل حتى لو فشل تسجيله)، لكن لازم يتسجل في
    // الـ server logs عشان محدش يلاحظ فجوة توثيق بصمت.
    console.error("[auditLog] Failed to write audit log entry:", err, { action, targetId });
  }
}
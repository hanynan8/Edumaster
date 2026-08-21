// app/lib/notificationHelpers.js
//
// Phase 6 — اليوم 50-51: نقطة واحدة لإنشاء إشعارات داخلية، مستخدمة من كل
// الأحداث اللي بتولّد إشعار (enrollment جديد، نتيجة كويز، تصحيح واجب،
// شهادة جديدة، إعلان كورس، رد على تعليق، سؤال جديد، دفع ناجح).
//
// 🔒 best-effort بالكامل ومقصود: زي issueCertificateForCompletedEnrollment
// في certificateHelpers.js بالظبط — فشل إنشاء إشعار (مثلاً مشكلة عابرة في
// الداتابيز) ميبوّظش العملية الأساسية اللي ولّدت الحدث (تسجيل كويز، تصحيح
// واجب، إلخ). كل الدوال هنا بتمسك أي خطأ وتسجله في الـ console بس.

import { getNotificationModel, getEnrollmentModel } from "@/app/lib/models";
import { getAuthModel } from "@/app/lib/mongodb";

/**
 * إشعار لمستخدم واحد.
 * @param {object} params
 * @param {string} params.user - ID المستخدم المستقبِل
 * @param {string} params.type - أحد قيم enum في Notification model
 * @param {string} params.title
 * @param {string} [params.message]
 * @param {string} [params.link] - رابط نسبي (بدون origin)، مثلاً "/courses/123"
 * @param {string} [params.course]
 */
export async function createNotification({ user, type, title, message = "", link = null, course = null }) {
  try {
    if (!user || !type || !title) return null;
    const Notification = getNotificationModel();
    return await Notification.create({ user, type, title, message, link, course });
  } catch (err) {
    console.error("[createNotification] error:", err);
    return null;
  }
}

/**
 * نفس إشعار واحد لعدة مستخدمين دفعة واحدة (مثلاً إعلان كورس لكل الطلاب
 * المسجلين) — insertMany بدل loop من create() لتقليل round-trips للداتابيز.
 * @param {string[]} userIds
 */
export async function createNotificationsForUsers(userIds, { type, title, message = "", link = null, course = null }) {
  try {
    const uniqueIds = [...new Set((userIds || []).map((id) => id?.toString()).filter(Boolean))];
    if (uniqueIds.length === 0) return [];
    const Notification = getNotificationModel();
    const docs = uniqueIds.map((user) => ({ user, type, title, message, link, course }));
    return await Notification.insertMany(docs, { ordered: false });
  } catch (err) {
    console.error("[createNotificationsForUsers] error:", err);
    return [];
  }
}

/**
 * كل الطلاب المسجلين فعليًا (enrollment حقيقي — مش أعضاء membership من غير
 * enrollment صريح، شوف access.js) في كورس معيّن — مستخدمة لإشعارات
 * الإعلانات (اليوم 46-47). بترجع array من user IDs (strings).
 */
export async function getEnrolledUserIds(courseId) {
  try {
    const Enrollment = getEnrollmentModel();
    const enrollments = await Enrollment.find({ course: courseId }, "user").lean();
    return enrollments.map((e) => e.user.toString());
  } catch (err) {
    console.error("[getEnrolledUserIds] error:", err);
    return [];
  }
}

/**
 * 🆕 كل الـ IDs بتاعة الأدمنز الحاليين — مستخدمة لإشعار كل الأدمنز لما مدرس
 * يبعت كورس للمراجعة (course_pending_review)، بدل ما نختار أدمن واحد
 * بالصدفة. بترجع array من strings.
 */
export async function getAdminUserIds() {
  try {
    const Auth = getAuthModel();
    const admins = await Auth.find({ role: "admin" }, "_id").lean();
    return admins.map((a) => a._id.toString());
  } catch (err) {
    console.error("[getAdminUserIds] error:", err);
    return [];
  }
}
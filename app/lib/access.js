// app/lib/access.js
//
// Phase 2 — اليوم 22: نقطة واحدة لفحص "هل المستخدم ده يقدر يشوف محتوى
// الكورس ده؟" بدل ما كل route (sections, lessons) يكرر نفس المنطق بطريقة
// مختلفة شوية. الوصول ممكن يجي من مصدرين مستقلين:
//
//   1) enrollment فعلي (سجل في Enrollment collection)
//   2) membership نشطة بتغطي الكورس ده (user.membership + MembershipPlan)
//
// 🔒 مهم: الفحص هنا real-time على الداتابيز في كل مرة — مفيش أي اعتماد على
// إن الطالب يكون "سجّل" الكورس explicitly. يعني عضو Pro مثلاً يقدر يفتح
// أي كورس مسموح لخطته على طول من غير ما يضغط "اشترك" الأول — وده بيطابق
// متطلب اليوم 22 حرفيًا ("قفل المحتوى بالكامل لو مفيش enrollment/membership
// فعالة، على مستوى الـ API").

import { getEnrollmentModel, getMembershipPlanModel } from "@/app/lib/models";
import { getAuthModel } from "@/app/lib/mongodb";

// membership "نشطة فعليًا دلوقتي" مش بس status === "active" في الداتابيز —
// لازم كمان متبقاش منتهية الصلاحية (lazy expiry check، بدون الحاجة لـ cron
// يحدّث status بنفسه على كل مستند). لو فيه cron/job بيحدّث status لاحقًا
// (Phase قادمة) هيبقى تحسين أداء بس، مش تغيير في صحة الفحص.
function isMembershipCurrentlyActive(membership) {
  if (!membership || membership.status !== "active") return false;
  if (membership.expiresAt && new Date(membership.expiresAt).getTime() <= Date.now()) {
    return false;
  }
  return Boolean(membership.plan);
}

/**
 * هل عضوية اليوزر الحالية (لو موجودة وفعّالة) بتغطي الكورس ده؟
 * @param {string} userId
 * @param {string|import("mongoose").Types.ObjectId} courseId
 */
export async function hasActiveMembershipAccessToCourse(userId, courseId) {
  if (!userId || !courseId) return false;

  const AuthModel = getAuthModel();
  const user = await AuthModel.findById(userId, "membership").lean();
  if (!isMembershipCurrentlyActive(user?.membership)) return false;

  const MembershipPlan = getMembershipPlanModel();
  const plan = await MembershipPlan.findById(user.membership.plan).lean();
  if (!plan || !plan.isActive) return false;

  // allowedCourses فاضية = الخطة دي بتفتح كل الكورسات (زي Pro)
  if (!plan.allowedCourses || plan.allowedCourses.length === 0) return true;

  return plan.allowedCourses.some((c) => c.toString() === courseId.toString());
}

/**
 * الفحص الكامل: enrollment فعلي أو membership فعالة. مفيدة لـ routes محتوى
 * الكورس (sections/lessons) عشان تقرر تسرّب videoUrl/fileUrl ولا لأ.
 * @returns {Promise<{isEnrolled: boolean, enrollment: object|null, hasMembershipAccess: boolean, hasAccess: boolean}>}
 */
export async function getCourseAccessForUser({ userId, courseId }) {
  if (!userId || !courseId) {
    return { isEnrolled: false, enrollment: null, hasMembershipAccess: false, hasAccess: false };
  }

  const Enrollment = getEnrollmentModel();
  // 🔒 SECURITY FIX (F1 — security audit): كنا بنتحقق بس من "الـ enrollment
  // موجود" من غير ما نفحص status — فلو حصل مستقبلًا وحد لغى enrollment
  // (status: "cancelled")، السجل كان لسه بيدي وصول كامل. "completed" لسه
  // لازم تفضل بتدي وصول (خريج عايز يراجع الكورس)، بس "cancelled" لأ.
  const [enrollment, hasMembershipAccess] = await Promise.all([
    Enrollment.findOne({ user: userId, course: courseId, status: { $ne: "cancelled" } }).lean(),
    hasActiveMembershipAccessToCourse(userId, courseId),
  ]);

  const isEnrolled = Boolean(enrollment);
  return {
    isEnrolled,
    enrollment: enrollment || null,
    hasMembershipAccess,
    hasAccess: isEnrolled || hasMembershipAccess,
  };
}
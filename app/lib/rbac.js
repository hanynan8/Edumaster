// app/lib/rbac.js
//
// هيلبر مشترك للتحقق من الصلاحيات جوه أي API route، بدل ما كل route يكرر
// نفس الكود (getServerSession + فحص role يدوي) زي ما كان حاصل في
// app/api/admin/users/*. الهدف: أي route جديد (courses, sections, lessons,
// enrollments...) يستخدم نفس النمط ده من أول يوم، فمفيش احتمال حد ينسى
// الفحص أو يكتبه غلط.
//
// طريقة الاستخدام جوه أي route:
//
//   import { requireRole } from "@/app/lib/rbac";
//
//   export async function POST(request) {
//     const auth = await requireRole(["teacher", "admin"]);
//     if (auth.response) return auth.response; // مفيش صلاحية → رجّع الخطأ فورًا
//     const { session } = auth;                // فيه صلاحية → استخدم session.user
//     ...
//   }

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/**
 * بيتحقق إن فيه session صالحة بس (أي مستخدم مسجل دخول، أي role).
 * @returns {Promise<{session: object, response: null} | {session: null, response: Response}>}
 */
export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { session: null, response: jsonResponse({ error: "unauthorized" }, 401) };
  }
  return { session, response: null };
}

/**
 * بيتحقق إن فيه session صالحة *و* الـ role بتاعها ضمن الأدوار المسموحة.
 * 🔒 SECURITY: بيرجع 401 (unauthorized) لو مفيش تسجيل دخول أصلاً، و403
 * (forbidden) لو مسجل دخول لكن role مالوش صلاحية — الفرق مهم للـ client
 * عشان يعرف يعمل إيه (يوجّه للوجين، ولا يعرض "مالكش صلاحية").
 * @param {string[]} allowedRoles - مثال: ["teacher", "admin"]
 */
export async function requireRole(allowedRoles) {
  const base = await requireSession();
  if (base.response) return base;

  if (!allowedRoles.includes(base.session.user.role)) {
    return { session: null, response: jsonResponse({ error: "forbidden" }, 403) };
  }
  return { session: base.session, response: null };
}

/**
 * بيتحقق إن المستخدم الحالي هو صاحب المورد (مثلاً: المدرس صاحب الكورس) أو
 * أدمن. مفيدة لـ routes زي PATCH /api/courses/[id] — المدرس يقدر يعدّل
 * كورساته بس، لكن الأدمن يقدر يعدّل أي كورس.
 * @param {object} session
 * @param {string|import("mongoose").Types.ObjectId} ownerId - قيمة الحقل
 *   اللي بيمثل صاحب المورد (مثلاً course.teacher)
 */
export function isOwnerOrAdmin(session, ownerId) {
  if (!session?.user) return false;
  if (session.user.role === "admin") return true;
  return String(session.user.id) === String(ownerId);
}

/**
 * 🆕 "طاقم الإدارة" على مستوى محتوى الكورسات: الأدمن + الموديريتور. الموديريتور
 * ليه نفس داشبورد المدرّس بالظبط لكن بيشوف ويدير كورسات كل المدرّسين (مش بس
 * كورساته)، من غير ما يوصل لأي حاجة في لوحة الأدمن (/admin و /api/admin).
 * @param {string|undefined} role
 */
export function isStaffRole(role) {
  return role === "admin" || role === "moderator";
}

/**
 * 🆕 صلاحية "إدارة/تعديل" محتوى الكورس (كورس، أقسام، دروس، كويزات، واجبات،
 * إعلانات، رسائل، تعليقات، تصحيح...) — للأدمن والموديريتور **بس**.
 *
 * ⚠️ المدرّس (حتى لو هو "المدرّس المشرف" Supervising teacher على الكورس)
 * ملوش أي صلاحية تعديل أو حذف: الـ Supervising teacher مجرد اسم بيظهر في
 * الـ UI + تسجيل مجاني في الكورس + متابعة تقدم الطلاب (شوف
 * canViewCoursePerformance). عشان كده الدالة دي مابتبصّش على ownerId خالص —
 * الباراميتر موجود بس للتوافق مع شكل النداءات القديمة (isOwnerOrStaff).
 * @param {object} session
 * @param {string|import("mongoose").Types.ObjectId} [_ownerId] - متجاهَل عمدًا
 */
export function canManageCourse(session, _ownerId) {
  if (!session?.user) return false;
  return isStaffRole(session.user.role);
}

/**
 * 🆕 متابعة تقدم/أداء طلاب كورس: طاقم الإدارة (أدمن + موديريتور) + المدرّس
 * المشرف على الكورس ده بالتحديد. دي الصلاحية الوحيدة اللي المدرّس بياخدها
 * على الكورس (قراءة فقط).
 * @param {object} session
 * @param {string|import("mongoose").Types.ObjectId} supervisorId - course.teacher
 */
export function canViewCoursePerformance(session, supervisorId) {
  if (!session?.user) return false;
  if (isStaffRole(session.user.role)) return true;
  return session.user.role === "teacher" && String(session.user.id) === String(supervisorId);
}

/**
 * 🆕 تصحيح الواجبات + الرد على رسائل الطلاب: طاقم الإدارة + المدرّس المشرف على
 * الكورس ده بالتحديد. ده مابيدّيش المدرّس أي تعديل في محتوى الكورس (واجبات/
 * دروس/كويزات...) — بس يشوف تسليمات الطلاب ويصحّحها ويتواصل معاهم.
 * @param {object} session
 * @param {string|import("mongoose").Types.ObjectId} supervisorId - course.teacher
 */
export function canGradeCourse(session, supervisorId) {
  return canViewCoursePerformance(session, supervisorId);
}

/** نفس صلاحية التصحيح — للرسائل بين الطالب والمدرّس المشرف. */
export function canHandleCourseMessages(session, supervisorId) {
  return canGradeCourse(session, supervisorId);
}

/**
 * 🆕 "عرض فقط" لصفحة بيانات الكورس (حتى لو لسه draft/pending): طاقم الإدارة +
 * المدرّس المشرف. مابتدّيش أي صلاحية تعديل ومابتفتحش محتوى الدروس (ده بيمر
 * بالـ enrollment زي الطالب بالظبط).
 */
export function canViewCourseDetails(session, supervisorId) {
  return canViewCoursePerformance(session, supervisorId);
}

/**
 * 🆕 "أدمن جوه الميتنج" (Daily owner token): أي مدرّس + طاقم الإدارة. ده منفصل
 * عن isMeetingStaff (إنشاء/تعديل/حذف الميتنجس في الموقع) — المدرّس بيفضل
 * ممنوع يدير الميتنجس من الموقع، لكن جوه الغرفة نفسها بقى مشرف كامل.
 * مابيدّيش وصول لوحده: الدخول لسه بيتفحص بـ checkMeetingAccess (لازم يكون
 * مدعو/جلسة عامة/enrollment).
 */
export function isMeetingRoomHost(session) {
  if (!session?.user) return false;
  return isStaffRole(session.user.role) || session.user.role === "teacher";
}

/**
 * 🆕 الميتنجس (المحاضرات اللايف) بقت من صلاحيات طاقم الإدارة بس (أدمن + موديريتور).
 * المدرّس اتشالت منه صلاحية إنشاء/إدارة/دخول الميتنجس خالص، حتى لو هو
 * "مدرّس الكورس" — عكس canManageCourse (دي كمان طاقم الإدارة بس دلوقتي).
 * @param {object} session
 */
export function isMeetingStaff(session) {
  return !!session?.user && isStaffRole(session.user.role);
}

/**
 * اختصار جاهز: يتحقق إن المستخدم owner للمورد أو admin، وبيرجّع نفس شكل
 * requireRole/requireSession (session/response) عشان الاستخدام يبقى متسق.
 * لازم تكون عندك الـ ownerId قبل ما تناديها (يعني بعد ما تجيب المستند من
 * الداتابيز أول حاجة).
 */
export async function requireOwnerOrAdmin(ownerId) {
  const base = await requireSession();
  if (base.response) return base;

  if (!isOwnerOrAdmin(base.session, ownerId)) {
    return { session: null, response: jsonResponse({ error: "forbidden" }, 403) };
  }
  return { session: base.session, response: null };
}
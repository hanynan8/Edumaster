// app/lib/courseGrants.js
//
// 🆕 تسجيل مجاني من الموديريتور: وهو بيضيف/يعدّل كورس بيختار طلاب مسجّلين في
// المنصة (بالإيميل) فيتسجّلوا في الكورس غصب عنهم — زي اللي اشترى الكورس بالظبط
// (Enrollment بمصدر "moderator_grant")، فالكورس بيتفتح عندهم على طول من غير ما
// يضغطوا "اشترك". نفس فكرة اختيار المدعوين في المحاضرات اللايف
// (app/lib/meetingInvites.js) لكن للكورسات.
//
// - parseGrantedEmails: بيقبل array أو نص ويرجّع إيميلات صالحة + lowercase + بدون
//   تكرار (نفس منطق parseInvitedEmails).
// - resolveGrantRecipients: بيحوّل الإيميلات لطلاب مسجّلين فعلًا (role = student
//   بس)، والإيميلات اللي مالهاش حساب طالب بترجع في unknown عشان الـ API يرد 400.
// - grantCourseAccess: بيسجّل المستخدمين (bulk، idempotent) وبيحدّث studentsCount.
// - notifyGrantedStudents: إشعار للطلاب المتسجّلين بالمنحة (بيتبعت لما الكورس
//   يبقى منشور — الكورس لسه pending مش ظاهر للطلاب).

import { getEnrollmentModel, getCourseModel } from "@/app/lib/models";
import { getAuthModel } from "@/app/lib/mongodb";
import { parseInvitedEmails } from "@/app/lib/meetingInvites";
import { createNotificationsForUsers } from "@/app/lib/notificationHelpers";

export const GRANT_SOURCE = "moderator_grant";

// حد أقصى معقول للطلب الواحد (حماية للـ API من payload ضخم جدًا) — أعلى بكتير
// من أي استخدام فعلي.
export const MAX_GRANT_EMAILS = 5000;

const CHUNK = 1000;

export function parseGrantedEmails(input) {
  return parseInvitedEmails(input);
}

/**
 * @param {string[]} emails - إيميلات جاهزة (lowercase، بدون تكرار)
 * @returns {Promise<{ users: {id: string, email: string, name: string}[], unknown: string[] }>}
 */
export async function resolveGrantRecipients(emails) {
  if (!emails || emails.length === 0) return { users: [], unknown: [] };
  const Auth = getAuthModel();
  const found = new Map();
  for (let i = 0; i < emails.length; i += CHUNK) {
    // 🆕 الطلاب بس (الحسابات القديمة من غير role بتتعامل كطلاب) — أي إيميل لحساب
    // مدرّس/موديريتور/أدمن بيرجع في unknown ويترفض.
    const rows = await Auth.find(
      {
        email: { $in: emails.slice(i, i + CHUNK) },
        $or: [{ role: "student" }, { role: { $exists: false } }, { role: null }],
      },
      "name email"
    ).lean();
    for (const u of rows) {
      found.set(String(u.email).toLowerCase(), { id: u._id.toString(), email: String(u.email).toLowerCase(), name: u.name || "" });
    }
  }
  return {
    users: emails.filter((e) => found.has(e)).map((e) => found.get(e)),
    unknown: emails.filter((e) => !found.has(e)),
  };
}

/**
 * يسجّل المستخدمين في الكورس بمصدر moderator_grant.
 * - اللي مسجّل بالفعل (أي مصدر) بيتساب زي ما هو ومابيتحسبش جديد.
 * - اللي كان enrollment بتاعه cancelled بيتفعّل تاني.
 * - مدرّس الكورس ومنشئه بيتستبعدوا (مش طلاب).
 * @returns {Promise<{ granted: number, alreadyEnrolled: number, skipped: number, grantedUserIds: string[] }>}
 */
export async function grantCourseAccess({ course, users, grantedBy }) {
  const courseId = course._id;
  const excluded = new Set([String(course.teacher?._id || course.teacher), course.createdBy ? String(course.createdBy) : null].filter(Boolean));
  const eligible = (users || []).filter((u) => !excluded.has(String(u.id)));
  const skipped = (users || []).length - eligible.length;
  if (eligible.length === 0) return { granted: 0, alreadyEnrolled: 0, skipped, grantedUserIds: [] };

  const Enrollment = getEnrollmentModel();
  const grantedUserIds = [];

  for (let i = 0; i < eligible.length; i += CHUNK) {
    const chunk = eligible.slice(i, i + CHUNK);
    const result = await Enrollment.bulkWrite(
      chunk.map((u) => ({
        updateOne: {
          filter: { user: u.id, course: courseId },
          update: {
            // user/course جايين من الـ filter تلقائيًا مع الـ upsert.
            $setOnInsert: {
              source: GRANT_SOURCE,
              status: "active",
              grantedBy: grantedBy || null,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false }
    );
    // upsertedIds: { [indexInBatch]: _id } — الفهرس بيشاور على chunk.
    for (const idx of Object.keys(result.upsertedIds || {})) {
      grantedUserIds.push(chunk[Number(idx)].id);
    }
  }

  // 🔁 اللي كان ملغي (cancelled) → يتفعّل تاني كمنحة جديدة.
  const reactivated = await Enrollment.find(
    { course: courseId, user: { $in: eligible.map((u) => u.id) }, status: "cancelled" },
    "user"
  ).lean();
  if (reactivated.length > 0) {
    await Enrollment.updateMany(
      { _id: { $in: reactivated.map((e) => e._id) } },
      { $set: { status: "active", source: GRANT_SOURCE, grantedBy: grantedBy || null } }
    );
    for (const e of reactivated) grantedUserIds.push(String(e.user));
  }

  if (grantedUserIds.length > 0) {
    // ✅ إحصائية محسوبة بالكود بس (زي POST /api/enrollments).
    await getCourseModel().findByIdAndUpdate(courseId, { $inc: { studentsCount: grantedUserIds.length } });
  }

  return {
    granted: grantedUserIds.length,
    alreadyEnrolled: eligible.length - grantedUserIds.length,
    skipped,
    grantedUserIds,
  };
}

/**
 * إشعار "اتفتحلك كورس جديد" لطلاب (best-effort — createNotificationsForUsers
 * بتمسك أي خطأ). لو userIds مش متحددة بنبعت لكل اللي اتسجّلوا بمنحة موديريتور
 * على الكورس ده (بيتستخدم وقت موافقة الأدمن على نشر الكورس).
 */
export async function notifyGrantedStudents({ course, userIds }) {
  try {
    let ids = userIds;
    if (!ids) {
      const rows = await getEnrollmentModel()
        .find({ course: course._id, source: GRANT_SOURCE, status: { $ne: "cancelled" } }, "user")
        .lean();
      ids = rows.map((r) => String(r.user));
    }
    if (!ids || ids.length === 0) return 0;
    await createNotificationsForUsers(ids, {
      type: "course_access_granted",
      key: "course_access_granted",
      params: { courseTitle: course.title },
      link: `/courses/${course._id}`,
      course: course._id,
    });
    return ids.length;
  } catch (err) {
    console.error("[notifyGrantedStudents] error:", err);
    return 0;
  }
}

/**
 * قايمة إيميلات الطلاب اللي الموديريتور سجّلهم في كورس (لعرضها في فورم التعديل).
 */
export async function listGrantedStudents(courseId) {
  const Enrollment = getEnrollmentModel();
  const rows = await Enrollment.find({ course: courseId, source: GRANT_SOURCE, status: { $ne: "cancelled" } }, "user")
    .sort({ createdAt: 1 })
    .lean();
  if (rows.length === 0) return [];
  const users = [];
  const ids = rows.map((r) => r.user);
  const Auth = getAuthModel();
  for (let i = 0; i < ids.length; i += CHUNK) {
    users.push(...(await Auth.find({ _id: { $in: ids.slice(i, i + CHUNK) } }, "name email").lean()));
  }
  return users
    .filter((u) => u.email)
    .map((u) => ({ id: u._id.toString(), name: u.name || "", email: String(u.email).toLowerCase() }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

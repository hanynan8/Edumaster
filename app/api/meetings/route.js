// app/api/meetings/route.js
//
// GET /api/meetings → "محاضراتي" — القائمة اللي بتغذّي صفحة /meet مباشرة،
// بتختلف حسب الـ role:
//   - طالب: اجتماعات الكورسات اللي عنده enrollment فعلي فيها بس (status
//     != cancelled). 🔒 قرار مقصود: زي getEnrolledUserIds (notificationHelpers)،
//     مش بنحسب وصول membership-only (بدون enrollment صريح) هنا عشان كده
//     كان هيحتاج فحص لكل كورس على حدة (N+1) بدل استعلام واحد على
//     Enrollment — لو طالب membership فتح كورس مباشرة من غير ما يسجل فيه
//     صراحة، مش هيشوف اجتماعاته هنا لحد ما يبقى عنده enrollment حقيقي.
//   - مدرس: اجتماعات كورساته هو بس (بكل حالات الكورس — draft/pending/
//     published — عشان يقدر يحضّر معاد قبل النشر).
//   - أدمن: كل الاجتماعات في المنصة (رقابة/إشراف عام).
//   - 🆕 أي مستخدم (طالب/مدرس): كمان أي اجتماع إيميله مدعو عليه صراحةً
//     (Meeting.invitedEmails) حتى لو مش مسجّل في الكورس.
//
// 🆕 الجلسات العامة (General session): محاضرة لايف مش تابعة لأي كورس
// (course = null) وبتظهر لكل المستخدمين المسجّلين على المنصة (طلاب ومدرسين
// وأدمن). بتتنشأ من POST هنا (مدرس/أدمن بس). أما محاضرات الكورسات العادية
// فلسه بتتنشأ من app/api/courses/[id]/meetings (POST) لأنها محتاجة فحص
// ownership على الكورس نفسه.
//
// 🆕 POST بيدعم كمان: invitedEmails (دعوة بالإيميل) و recurrence/timeZone
// (محاضرات متكررة) — شوف app/lib/meetingCreate.js.

import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getMeetingModel, getCourseModel, getEnrollmentModel } from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";
import { createNotificationsForUsers, getAllUserIds } from "@/app/lib/notificationHelpers";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import { resolveSecureStoredUrl } from "@/app/lib/bunny";
import { serializeMeeting } from "@/app/lib/meetingSerialize";
import { createMeetingOrSeries, sendInvitations } from "@/app/lib/meetingCreate";
import { formatMeetingWhen } from "@/app/lib/meetingTime";

// 🆕 دعوة عدد كبير من المستخدمين = إيميلات كتير (Resend batch) — نرفع حد وقت
// التنفيذ على Vercel (بيتجاهل لو الاستضافة مش Vercel).
export const maxDuration = 60;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(request) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    await connectToMongo();
    const Meeting = getMeetingModel();
    getCourseModel();
    getAuthModel();

    const query = {};
    const userEmail = String(session.user.email || "").trim().toLowerCase();
    // 🆕 المدعوين بالإيميل — بيتضافوا لأي role غير الأدمن (الأدمن بيشوف كله أصلًا).
    const invitedClause = userEmail ? [{ invitedEmails: userEmail }] : [];

    // 🆕 الجلسات العامة (course = null) ظاهرة لكل المستخدمين.
    if (session.user.role === "teacher") {
      query.$or = [{ teacher: session.user.id }, { course: null }, ...invitedClause];
    } else if (session.user.role === "student") {
      const Enrollment = getEnrollmentModel();
      const enrollments = await Enrollment.find(
        { user: session.user.id, status: { $ne: "cancelled" } },
        "course"
      ).lean();
      const courseIds = enrollments.map((e) => e.course);
      query.$or = [{ course: { $in: courseIds } }, { course: null }, ...invitedClause];
    }
    // أدمن: مفيش فلتر — كل الاجتماعات.

    const meetings = await Meeting.find(query)
      .populate("course", "title thumbnail")
      .populate("teacher", "name")
      .sort({ scheduledAt: 1 })
      .lean();

    const isAdmin = session.user.role === "admin";
    return jsonResponse({
      meetings: meetings.map((m) => {
        const teacherId = m.teacher?._id ? m.teacher._id.toString() : m.teacher?.toString();
        const canSeeInvitees = isAdmin || teacherId === String(session.user.id);
        return {
          ...serializeMeeting(m, { includeInvitees: canSeeInvitees }),
          courseThumbnail: resolveSecureStoredUrl(m.course?.thumbnail),
        };
      }),
    });
  } catch (err) {
    console.error("[/api/meetings] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

// 🆕 POST /api/meetings { title, scheduledAt, description?, durationMinutes?, link?,
//   invitedEmails?, timeZone?, recurrence? }
// → إنشاء جلسة عامة (من غير كورس) — مدرس/أدمن بس. بنفس منطق إنشاء غرفة Daily
// تلقائيًا (أو link يدوي) زي app/api/courses/[id]/meetings.
export async function POST(request) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;
    if (session.user.role !== "teacher" && session.user.role !== "admin") {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const rl = await enforceRateLimit(request, {
      keyPrefix: "meetings:create",
      limit: 10,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    const body = await request.json().catch(() => null);

    await connectToMongo();
    const result = await createMeetingOrSeries({ teacherId: session.user.id, courseId: null, body });
    if (!result.ok) return jsonResponse(result.body, result.status);

    const { meetings, invitedEmails, recurrenceRule } = result;
    const first = meetings[0];

    // 🔔 إشعار داخل الموقع لكل المستخدمين المسجّلين (best-effort) — إشعار واحد
    // للسلسلة كلها مش لكل محاضرة. مفيش إيميل جماعي للجلسات العامة عن قصد
    // (عدد المستخدمين ممكن يكون كبير).
    const allUserIds = (await getAllUserIds()).filter((id) => id !== String(session.user.id));
    if (allUserIds.length > 0) {
      await createNotificationsForUsers(allUserIds, {
        type: "meeting_scheduled",
        title: meetings.length > 1 ? "سلسلة محاضرات مباشرة جديدة للجميع" : "محاضرة مباشرة جديدة للجميع",
        message: `${first.title} — ${formatMeetingWhen(first.scheduledAt, { locale: "ar-EG", timeZone: recurrenceRule?.timeZone, withZoneName: true })}${
          meetings.length > 1 ? ` (${meetings.length} محاضرات)` : ""
        }`,
        link: "/meet",
      });
    }

    // 📧 دعوات الإيميل للمدعوين صراحةً.
    const invites = await sendInvitations({
      emails: invitedEmails,
      inviterId: session.user.id,
      inviterName: session.user.name,
      firstMeeting: first,
      occurrences: meetings.length,
      recurrenceRule,
    });

    return jsonResponse(
      {
        ...serializeMeeting(first, { includeInvitees: true }),
        created: meetings.length,
        invitesSent: invites.emailed,
        meetings: meetings.map((m) => serializeMeeting(m, { includeInvitees: true })),
      },
      201
    );
  } catch (err) {
    console.error("[/api/meetings] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

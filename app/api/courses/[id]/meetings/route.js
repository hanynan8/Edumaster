// app/api/courses/[id]/meetings/route.js
//
// 🆕 محاضرات لايف (Daily) لكورس معيّن. نفس فلسفة app/api/courses/[id]/announcements
// بالظبط في فحص الصلاحيات:
//
// GET  /api/courses/[id]/meetings → اجتماعات الكورس، الأقرب زمنيًا أولًا.
//   صاحب الكورس/أدمن بيشوفهم دايمًا (بما فيهم كورس draft/pending — المدرس
//   يقدر يحضّر معاد المحاضرة قبل ما الكورس يتنشر أصلاً)، وأي حد تاني لازم
//   يكون عنده وصول فعلي (enrollment أو membership نشطة).
//
// POST /api/courses/[id]/meetings { title, scheduledAt, description?,
//   durationMinutes?, link?, invitedEmails?, timeZone?, recurrence? }
//   → صاحب الكورس/أدمن بس. 🆕 invitedEmails = دعوة بالإيميل، recurrence =
//   محاضرات متكررة (شوف app/lib/meetingCreate.js). بعد الإنشاء بيبعت إشعار
//   "meeting_scheduled" لكل طالب مسجّل فعليًا في الكورس (insertMany، مش loop).
//
// 🔄 التحديث (Daily.co): الرابط بقى اختياري في الـ body — بنستخدم
//   isDailyConfigured + createDailyRoom عشان ننشئ غرفة اجتماع Daily فعلية
//   ونجيب رابطها تلقائيًا (source: "daily")، من غير أي ربط حساب من ناحية
//   المدرس (مفتاح API واحد بتاع المنصة كلها). لو DAILY_API_KEY مش متظبط
//   على السيرفر، أو فشل إنشاء الغرفة، بنرجع للسلوك القديم: لازم يبعت
//   `link` يدوي (source: "manual").

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getMeetingModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { getCourseAccessForUser } from "@/app/lib/access";
import { createNotificationsForUsers, getEnrolledUserIds } from "@/app/lib/notificationHelpers";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import { getAuthModel } from "@/app/lib/mongodb";
import { sendMeetingScheduledEmail } from "@/app/lib/emailHelpers";
import { serializeMeeting } from "@/app/lib/meetingSerialize";
import { createMeetingOrSeries, sendInvitations } from "@/app/lib/meetingCreate";
import { describeRecurrence } from "@/app/lib/meetingRecurrence";

// 🆕 دعوة عدد كبير من المستخدمين = إيميلات كتير (Resend batch) — نرفع حد وقت
// التنفيذ على Vercel (بيتجاهل لو الاستضافة مش Vercel).
export const maxDuration = 60;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const Course = getCourseModel();
    const course = await Course.findById(id, "teacher").lean();
    if (!course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const canManage = isOwnerOrAdmin(session, course.teacher);
    if (!canManage) {
      const access = await getCourseAccessForUser({ userId: session.user.id, courseId: id });
      // 🆕 بنرجّع سبب الرفض التفصيلي (access.reason) بدل "enrollment_required"
      // ثابتة — شوف app/lib/access.js getCourseAccessDenialReason.
      if (!access.hasAccess) return jsonResponse({ error: "forbidden", reason: access.reason }, 403);
    }

    const Meeting = getMeetingModel();
    const meetings = await Meeting.find({ course: id }).sort({ scheduledAt: 1 }).lean();

    return jsonResponse({ meetings: meetings.map((m) => serializeMeeting(m, { includeInvitees: canManage })) });
  } catch (err) {
    console.error("[/api/courses/[id]/meetings] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const Course = getCourseModel();
    const course = await Course.findById(id, "teacher title");
    if (!course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;
    if (!isOwnerOrAdmin(session, course.teacher)) return jsonResponse({ error: "forbidden" }, 403);

    // 🔒 نفس منطق rate limit إعلانات الكورس — كل اجتماع جديد بيبعت إشعار
    // لكل طالب مسجّل، فمحتاجين نمنع استخدامه كوسيلة سبام.
    const rl = await enforceRateLimit(request, {
      keyPrefix: "meetings:create",
      limit: 10,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    const body = await request.json().catch(() => null);

    // 🆕 الإنشاء (محاضرة واحدة أو سلسلة متكررة) + روابط Daily/اليدوي + المدعوين
    // اتنقلوا لـ app/lib/meetingCreate.js (مشترك مع POST /api/meetings).
    const result = await createMeetingOrSeries({ teacherId: session.user.id, courseId: id, body });
    if (!result.ok) return jsonResponse(result.body, result.status);

    const { meetings, invitedEmails, recurrenceRule } = result;
    const first = meetings[0];
    const isSeries = meetings.length > 1;

    // 🔔 best-effort — نفس فلسفة الإعلانات، فشل الإشعار مايوقفش نجاح إنشاء
    // الاجتماع نفسه (اللي نجح فعلًا فوق). إشعار/إيميل واحد للسلسلة كلها.
    const enrolledUserIds = await getEnrolledUserIds(id);
    const notifiedEmails = new Set();
    if (enrolledUserIds.length > 0) {
      await createNotificationsForUsers(enrolledUserIds, {
        type: "meeting_scheduled",
        title: isSeries
          ? `سلسلة محاضرات مباشرة جديدة في دورة ${course.title}`
          : `محاضرة مباشرة جديدة في دورة ${course.title}`,
        message: `${first.title} — ${first.scheduledAt.toLocaleString("ar-EG")}${
          isSeries ? ` (${meetings.length} محاضرات، ${describeRecurrence(recurrenceRule, "ar")})` : ""
        }`,
        link: "/meet",
        course: id,
      });

      // 🆕 إيميل كمان، مش بس إشعار داخل الموقع — عشان طالب مش فاتح الموقع
      // وقت الإضافة ميفوّتش المحاضرة تمامًا لحد ما يفتحه بنفسه بالصدفة
      // (شوف app/lib/emailHelpers.js sendMeetingScheduledEmail). best-effort
      // بالكامل ومش بيوقف استجابة الـ API لو فشل.
      const AuthModel = getAuthModel();
      const users = await AuthModel.find({ _id: { $in: enrolledUserIds } }, "name email").lean();
      for (const user of users) {
        if (!user.email) continue;
        notifiedEmails.add(String(user.email).toLowerCase());
        sendMeetingScheduledEmail({
          toEmail: user.email,
          name: user.name || "Student",
          courseTitle: course.title,
          meetingTitle: first.title,
          scheduledAt: first.scheduledAt,
          occurrences: meetings.length,
          recurrenceLabel: recurrenceRule ? describeRecurrence(recurrenceRule, "en") : "",
        }).catch((err) => console.error("[/api/courses/[id]/meetings] sendMeetingScheduledEmail failed:", err));
      }
    }

    // 📧 دعوات للمدعوين صراحةً بالإيميل — بنستبعد الطلاب المسجّلين (اتبلّغوا
    // فوق بالفعل) عشان محدّش ياخد إيميلين على نفس المحاضرة.
    const invites = await sendInvitations({
      emails: invitedEmails.filter((e) => !notifiedEmails.has(e)),
      inviterId: session.user.id,
      inviterName: session.user.name,
      firstMeeting: first,
      courseTitle: course.title,
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
    console.error("[/api/courses/[id]/meetings] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
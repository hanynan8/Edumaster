// app/api/cron/meeting-reminders/route.js
//
// 🆕 GET /api/cron/meeting-reminders — بيبعت تذكير (إشعار داخلي + إيميل)
// لكل طالب مسجّل في كورس عنده محاضرة لايف هتبدأ خلال ~10 دقايق —
// 🆕 ومعاهم المدعوين بالإيميل (Meeting.invitedEmails) حتى لو مش مسجّلين في الكورس. قبل كده
// الإشعار الوحيد كان بيتبعت مرة واحدة وقت *إنشاء* المحاضرة — لو الطالب
// نسي، مفيش أي حاجة تفكّره قريب من الميعاد.
//
// 🔒 محمي بـ CRON_SECRET بنفس أسلوب app/api/cron/membership-expiry — لازم
// `Authorization: Bearer <CRON_SECRET>`.
//
// 📋 لازم يتشغّل كل ~5 دقايق (مش كل دقيقة) عشان يمسك أي محاضرة داخلة في
// شباك [3, 15] دقيقة من دلوقتي (شوف REMINDER_WINDOW تحت) — الشباك أعرض بكتير من
// فترة تشغيل الـ cron عشان مفيش محاضرة "تفوت" بين تشغيلتين. Meeting.
// reminderSentAt بيضمن إن كل محاضرة تاخد تذكير واحد بس حتى لو الشباك
// اتغطى في أكتر من تشغيلة.
//
// مثال vercel.json:
//   { "path": "/api/cron/meeting-reminders", "schedule": "*/5 * * * *" }

import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getMeetingModel, getCourseModel } from "@/app/lib/models";
import { createNotificationsForUsers, getEnrolledUserIds, getAllUserIds } from "@/app/lib/notificationHelpers";
import { sendMeetingReminderEmails } from "@/app/lib/emailHelpers";

// 🔧 الإيميلات بتتبعت عبر Resend Batch API (sendMeetingReminderEmails) بدل نداء لكل
// مستخدم — النداءات المتوازية كانت بتعدّي حد Resend (2 طلب/ثانية) وبتفشل بصمت.
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;

// 🔧 الشباك كان [8, 13] دقيقة (عرضه 5 دقايق = نفس فترة الـ cron) فأي تأخير بسيط في
// تشغيل الـ cron كان بيفوّت المحاضرة من غير تذكير. وسّعناه لـ [3, 15] — reminderSentAt
// بيضمن تذكير واحد بس لكل محاضرة مهما اتكرر التشغيل.
const WINDOW_MIN_MS = 3 * 60 * 1000;
const WINDOW_MAX_MS = 15 * 60 * 1000;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function getInvitedUsers(AuthModel, invitedEmails) {
  const emails = (invitedEmails || []).map((e) => String(e).trim().toLowerCase()).filter(Boolean);
  if (emails.length === 0) return [];
  return AuthModel.find({ email: { $in: emails } }, "name email").lean();
}

// بيعالج محاضرة واحدة ويرجّع { notified, emailed }.
async function processMeeting(meeting, AuthModel, now) {
  const tz = meeting.recurrence?.timeZone;
  const minutesLeft = Math.max(1, Math.round((new Date(meeting.scheduledAt).getTime() - now) / 60000));
  let notified = 0;
  let emailed = 0;

  // جلسة عامة: إشعار داخل الموقع لكل المستخدمين + إيميل للمدعوين صراحةً بس.
  if (!meeting.course) {
    const allUserIds = await getAllUserIds();
    const created = await createNotificationsForUsers(allUserIds, {
      type: "meeting_scheduled",
      title: `محاضرة "${meeting.title}" ستبدأ بعد ${minutesLeft} دقيقة`,
      message: "جلسة مباشرة للجميع — استعد للدخول",
      link: "/meet",
    });
    notified += created.length;

    const invited = (await getInvitedUsers(AuthModel, meeting.invitedEmails)).filter((u) => u.email);
    emailed += await sendMeetingReminderEmails(
      invited.map((u) => ({ toEmail: u.email, name: u.name })),
      { courseTitle: "Live session", meetingTitle: meeting.title, scheduledAt: meeting.scheduledAt, minutesLeft, timeZone: tz }
    );
    return { notified, emailed };
  }

  const courseId = meeting.course?._id || meeting.course;
  const enrolledUserIds = await getEnrolledUserIds(courseId);
  const invitedUsers = await getInvitedUsers(AuthModel, meeting.invitedEmails);
  const recipientIds = [...new Set([...enrolledUserIds.map(String), ...invitedUsers.map((u) => String(u._id))])];
  if (recipientIds.length === 0) return { notified, emailed };

  const courseTitle = meeting.course?.title || "الدورة";
  const created = await createNotificationsForUsers(recipientIds, {
    type: "meeting_scheduled",
    title: `محاضرة "${meeting.title}" ستبدأ بعد ${minutesLeft} دقيقة`,
    message: `${courseTitle} — استعد للدخول`,
    link: "/meet",
    course: courseId,
  });
  notified += created.length;

  const users = await AuthModel.find({ _id: { $in: recipientIds } }, "name email").lean();
  emailed += await sendMeetingReminderEmails(
    users.filter((u) => u.email).map((u) => ({ toEmail: u.email, name: u.name })),
    { courseTitle, meetingTitle: meeting.title, scheduledAt: meeting.scheduledAt, minutesLeft, timeZone: tz }
  );
  return { notified, emailed };
}

export async function GET(request) {
  try {
    if (CRON_SECRET) {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${CRON_SECRET}`) return jsonResponse({ error: "unauthorized" }, 401);
    } else if (process.env.NODE_ENV === "production") {
      console.error("[cron/meeting-reminders] CRON_SECRET not set in production — refusing request");
      return jsonResponse({ error: "cron_secret_not_configured" }, 503);
    } else {
      console.warn("[cron/meeting-reminders] CRON_SECRET not set — running without auth check (dev only)");
    }

    await connectToMongo();
    const Meeting = getMeetingModel();
    getCourseModel();

    const now = Date.now();
    const meetings = await Meeting.find({
      reminderSentAt: null,
      scheduledAt: { $gte: new Date(now + WINDOW_MIN_MS), $lte: new Date(now + WINDOW_MAX_MS) },
    })
      .populate("course", "title")
      .lean();

    if (meetings.length === 0) return jsonResponse({ processed: 0 });

    const AuthModel = getAuthModel();
    let processed = 0;
    let notified = 0;
    let emailed = 0;

    for (const meeting of meetings) {
      // 🔒 "حجز" ذرّي للمحاضرة قبل الإرسال: لو تشغيلتين cron اتداخلوا، واحدة بس بتكسب
      // وتبعت — قبل كده الفحص (reminderSentAt: null) والتعليم كانوا منفصلين فالطلاب
      // كانوا بياخدوا التذكير مرتين.
      const claimed = await Meeting.findOneAndUpdate(
        { _id: meeting._id, reminderSentAt: null },
        { reminderSentAt: new Date() }
      );
      if (!claimed) continue;
      processed++;

      try {
        const r = await processMeeting(meeting, AuthModel, now);
        notified += r.notified;
        emailed += r.emailed;
      } catch (err) {
        console.error(`[cron/meeting-reminders] meeting ${meeting._id} failed:`, err);
        // لو مفيش حاجة اتبعتت أصلًا، نفك الحجز عشان التشغيلة الجاية تعيد المحاولة.
        await Meeting.updateOne({ _id: meeting._id }, { reminderSentAt: null }).catch(() => null);
      }
    }

    return jsonResponse({ processed, notified, emailed });
  } catch (err) {
    console.error("[/api/cron/meeting-reminders] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

// app/api/cron/meeting-reminders/route.js
//
// 🆕 GET /api/cron/meeting-reminders — بيبعت تذكير (إشعار داخلي + إيميل)
// لكل طالب مسجّل في كورس عنده محاضرة لايف هتبدأ خلال ~10 دقايق. قبل كده
// الإشعار الوحيد كان بيتبعت مرة واحدة وقت *إنشاء* المحاضرة — لو الطالب
// نسي، مفيش أي حاجة تفكّره قريب من الميعاد.
//
// 🔒 محمي بـ CRON_SECRET بنفس أسلوب app/api/cron/membership-expiry — لازم
// `Authorization: Bearer <CRON_SECRET>`.
//
// 📋 لازم يتشغّل كل ~5 دقايق (مش كل دقيقة) عشان يمسك أي محاضرة داخلة في
// شباك [8, 13] دقيقة من دلوقتي (شوف REMINDER_WINDOW تحت) — الشباك أعرض من
// فترة تشغيل الـ cron عشان مفيش محاضرة "تفوت" بين تشغيلتين. Meeting.
// reminderSentAt بيضمن إن كل محاضرة تاخد تذكير واحد بس حتى لو الشباك
// اتغطى في أكتر من تشغيلة.
//
// مثال vercel.json:
//   { "path": "/api/cron/meeting-reminders", "schedule": "*/5 * * * *" }

import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getMeetingModel, getCourseModel } from "@/app/lib/models";
import { createNotificationsForUsers, getEnrolledUserIds } from "@/app/lib/notificationHelpers";
import { sendMeetingReminderEmail } from "@/app/lib/emailHelpers";

const CRON_SECRET = process.env.CRON_SECRET;

// من 8 لـ 13 دقيقة قدام دلوقتي — نطاق حوالين "10 دقايق قبل" يحتمل إن الـ
// cron ميتشغّلش بالظبط كل دقيقة.
const WINDOW_MIN_MS = 8 * 60 * 1000;
const WINDOW_MAX_MS = 13 * 60 * 1000;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
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
    let notified = 0;
    let emailed = 0;

    for (const meeting of meetings) {
      const enrolledUserIds = await getEnrolledUserIds(meeting.course?._id || meeting.course);
      if (enrolledUserIds.length === 0) {
        await Meeting.updateOne({ _id: meeting._id }, { reminderSentAt: new Date() });
        continue;
      }

      const minutesLeft = Math.max(1, Math.round((new Date(meeting.scheduledAt).getTime() - now) / 60000));
      const courseTitle = meeting.course?.title || "الكورس";

      // إشعار داخلي (يظهر في NotificationBell فورًا).
      const created = await createNotificationsForUsers(enrolledUserIds, {
        type: "meeting_scheduled",
        title: `محاضرة "${meeting.title}" هتبدأ بعد ${minutesLeft} دقيقة`,
        message: `${courseTitle} — استعد للدخول`,
        link: "/meet",
        course: meeting.course?._id || meeting.course,
      });
      notified += created.length;

      // إيميل — best-effort، بيوصل حتى لو الطالب مش فاتح الموقع أصلًا.
      const users = await AuthModel.find({ _id: { $in: enrolledUserIds } }, "name email").lean();
      for (const user of users) {
        if (!user.email) continue;
        const ok = await sendMeetingReminderEmail({
          toEmail: user.email,
          name: user.name || "Student",
          courseTitle,
          meetingTitle: meeting.title,
          scheduledAt: meeting.scheduledAt,
          minutesLeft,
        });
        if (ok) emailed += 1;
      }

      await Meeting.updateOne({ _id: meeting._id }, { reminderSentAt: new Date() });
    }

    return jsonResponse({ processed: meetings.length, notified, emailed });
  } catch (err) {
    console.error("[/api/cron/meeting-reminders] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
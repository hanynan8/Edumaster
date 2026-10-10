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
// شباك [8, 13] دقيقة من دلوقتي (شوف REMINDER_WINDOW تحت) — الشباك أعرض من
// فترة تشغيل الـ cron عشان مفيش محاضرة "تفوت" بين تشغيلتين. Meeting.
// reminderSentAt بيضمن إن كل محاضرة تاخد تذكير واحد بس حتى لو الشباك
// اتغطى في أكتر من تشغيلة.
//
// مثال vercel.json:
//   { "path": "/api/cron/meeting-reminders", "schedule": "*/5 * * * *" }

import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getMeetingModel, getCourseModel } from "@/app/lib/models";
import { createNotificationsForUsers, getEnrolledUserIds, getAllUserIds } from "@/app/lib/notificationHelpers";
import { sendMeetingReminderEmail } from "@/app/lib/emailHelpers";

// 🆕 PERFORMANCE + RELIABILITY: كان الإيميل بيتبعت واحد واحد بالتتابع
// (for...of + await) — كورس فيه 50-100 طالب يعني 50-100 نداء شبكة متتالي
// لـ Resend API، وده ممكن ياخد 15-30+ ثانية لكورس واحد بس. Vercel بيوقف
// أي function تلقائيًا بعد حد أقصى للوقت (10 ثانية على خطة Hobby)، ومفيش
// maxDuration متظبطة هنا أصلًا (شوف تحت). لو حصل timeout، الـ function
// بتتقفل *قبل* ما نعلّم reminderSentAt، فالمحاضرة هتتعالج تاني في التشغيلة
// الجاية بعد 5 دقايق — يعني طلاب اتبعتلهم إيميل هيتبعتلهم تاني (spam).
// الحل: نبعت بالتوازي بحد أقصى (batch of 10 في نفس الوقت) بدل التتابع
// الكامل — أسرع بشكل كبير من غير ما نقصف Resend API بمئات الطلبات مرة واحدة.
const EMAIL_BATCH_SIZE = 10;

async function sendEmailsInBatches(users, buildPayload) {
  let emailed = 0;
  for (let i = 0; i < users.length; i += EMAIL_BATCH_SIZE) {
    const batch = users.slice(i, i + EMAIL_BATCH_SIZE);
    const results = await Promise.all(
      batch.map((user) => sendMeetingReminderEmail(buildPayload(user)).catch(() => false))
    );
    emailed += results.filter(Boolean).length;
  }
  return emailed;
}

// 🆕 المدعوين بالإيميل (مستخدمين مسجّلين في الموقع) — كانوا بياخدوا الدعوة وقت
// الإنشاء بس ومفيش أي تذكير قبل الميعاد لو مش طلاب في الكورس.
async function getInvitedUsers(AuthModel, invitedEmails) {
  const emails = (invitedEmails || []).map((e) => String(e).trim().toLowerCase()).filter(Boolean);
  if (emails.length === 0) return [];
  return AuthModel.find({ email: { $in: emails } }, "name email").lean();
}

// 🆕 PERFORMANCE: بيرفع الحد الأقصى لوقت تنفيذ الـ function على Vercel (لو
// الاستضافة مش Vercel، الإكسبورت ده بيتجاهل من غير أي تأثير). قيمة 60
// ثانية سخية كفاية لمعالجة كورسات فيها مئات الطلاب حتى بعد تحسين الإرسال
// بالـ batching فوق، ومتاحة على خطة Vercel Pro فما فوق (Hobby أقصاها 10s
// برضه — لو الاستضافة Hobby ولسه بيحصل timeout مع كورسات كبيرة جدًا، الحل
// الأمثل يبقى تحويل الإرسال لـ queue/background job بدل تنفيذه جوه الـ
// cron request نفسه).
export const maxDuration = 60;

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
      // 🆕 جلسة عامة (من غير كورس): تذكير داخل الموقع لكل المستخدمين، من غير إيميل جماعي —
      // لكن المدعوين صراحةً بياخدوا إيميل تذكير كمان (قايمتهم محدودة بالدعوة).
      if (!meeting.course) {
        const allUserIds = await getAllUserIds();
        const minutesLeftGeneral = Math.max(1, Math.round((new Date(meeting.scheduledAt).getTime() - now) / 60000));
        const createdGeneral = await createNotificationsForUsers(allUserIds, {
          type: "meeting_scheduled",
          title: `محاضرة "${meeting.title}" ستبدأ بعد ${minutesLeftGeneral} دقيقة`,
          message: "جلسة مباشرة للجميع — استعد للدخول",
          link: "/meet",
        });
        notified += createdGeneral.length;

        const invitedGeneral = (await getInvitedUsers(AuthModel, meeting.invitedEmails)).filter((u) => u.email);
        emailed += await sendEmailsInBatches(invitedGeneral, (user) => ({
          toEmail: user.email,
          name: user.name || "Student",
          courseTitle: "Live session",
          meetingTitle: meeting.title,
          scheduledAt: meeting.scheduledAt,
          minutesLeft: minutesLeftGeneral,
        }));

        await Meeting.updateOne({ _id: meeting._id }, { reminderSentAt: new Date() });
        continue;
      }

      const enrolledUserIds = await getEnrolledUserIds(meeting.course?._id || meeting.course);
      // 🆕 المستلمين = المسجّلين في الكورس + المدعوين بالإيميل (من غير تكرار).
      const invitedUsers = await getInvitedUsers(AuthModel, meeting.invitedEmails);
      const recipientIds = [...new Set([...enrolledUserIds.map(String), ...invitedUsers.map((u) => String(u._id))])];
      if (recipientIds.length === 0) {
        await Meeting.updateOne({ _id: meeting._id }, { reminderSentAt: new Date() });
        continue;
      }

      const minutesLeft = Math.max(1, Math.round((new Date(meeting.scheduledAt).getTime() - now) / 60000));
      const courseTitle = meeting.course?.title || "الدورة";

      // إشعار داخلي (يظهر في NotificationBell فورًا).
      const created = await createNotificationsForUsers(recipientIds, {
        type: "meeting_scheduled",
        title: `محاضرة "${meeting.title}" ستبدأ بعد ${minutesLeft} دقيقة`,
        message: `${courseTitle} — استعد للدخول`,
        link: "/meet",
        course: meeting.course?._id || meeting.course,
      });
      notified += created.length;

      // إيميل — best-effort، بيوصل حتى لو الطالب مش فاتح الموقع أصلًا.
      const users = await AuthModel.find({ _id: { $in: recipientIds } }, "name email").lean();
      const usersWithEmail = users.filter((u) => u.email);
      emailed += await sendEmailsInBatches(usersWithEmail, (user) => ({
        toEmail: user.email,
        name: user.name || "Student",
        courseTitle,
        meetingTitle: meeting.title,
        scheduledAt: meeting.scheduledAt,
        minutesLeft,
      }));

      await Meeting.updateOne({ _id: meeting._id }, { reminderSentAt: new Date() });
    }

    return jsonResponse({ processed: meetings.length, notified, emailed });
  } catch (err) {
    console.error("[/api/cron/meeting-reminders] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
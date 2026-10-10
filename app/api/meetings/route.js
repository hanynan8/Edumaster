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
//
// 🆕 الجلسات العامة (General session): محاضرة لايف مش تابعة لأي كورس
// (course = null) وبتظهر لكل المستخدمين المسجّلين على المنصة (طلاب ومدرسين
// وأدمن). بتتنشأ من POST هنا (مدرس/أدمن بس). أما محاضرات الكورسات العادية
// فلسه بتتنشأ من app/api/courses/[id]/meetings (POST) لأنها محتاجة فحص
// ownership على الكورس نفسه.

import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getMeetingModel, getCourseModel, getEnrollmentModel } from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";
import { createNotificationsForUsers, getAllUserIds } from "@/app/lib/notificationHelpers";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import { isDailyConfigured, createDailyRoom } from "@/app/lib/daily";
import { resolveSecureStoredUrl } from "@/app/lib/bunny";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function serializeMeeting(m) {
  return {
    id: m._id.toString(),
    course: m.course?._id ? m.course._id.toString() : m.course?.toString() || null,
    isGeneral: !m.course,
    courseTitle: m.course?.title,
    courseThumbnail: resolveSecureStoredUrl(m.course?.thumbnail),
    teacher: m.teacher?._id ? m.teacher._id.toString() : m.teacher?.toString(),
    teacherName: m.teacher?.name,
    title: m.title,
    description: m.description || "",
    link: m.link,
    source: m.source || "manual",
    scheduledAt: m.scheduledAt,
    durationMinutes: m.durationMinutes,
    recordings: (m.recordings || []).map((r) => ({
      id: r.dailyRecordingId,
      durationSeconds: r.durationSeconds,
      createdAt: r.createdAt,
    })),
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
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

    // 🆕 الجلسات العامة (course = null) ظاهرة لكل المستخدمين.
    if (session.user.role === "teacher") {
      query.$or = [{ teacher: session.user.id }, { course: null }];
    } else if (session.user.role === "student") {
      const Enrollment = getEnrollmentModel();
      const enrollments = await Enrollment.find(
        { user: session.user.id, status: { $ne: "cancelled" } },
        "course"
      ).lean();
      const courseIds = enrollments.map((e) => e.course);
      query.$or = [{ course: { $in: courseIds } }, { course: null }];
    }
    // أدمن: مفيش فلتر — كل الاجتماعات.

    const meetings = await Meeting.find(query)
      .populate("course", "title thumbnail")
      .populate("teacher", "name")
      .sort({ scheduledAt: 1 })
      .lean();

    return jsonResponse({ meetings: meetings.map(serializeMeeting) });
  } catch (err) {
    console.error("[/api/meetings] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// 🆕 POST /api/meetings { title, scheduledAt, description?, durationMinutes?, link? }
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
    const title = String(body?.title || "").trim();
    const manualLink = String(body?.link || "").trim();
    const description = String(body?.description || "").trim();
    if (!title) return jsonResponse({ error: "missing_title" }, 400);

    const scheduledAt = new Date(body?.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) return jsonResponse({ error: "invalid_scheduled_at" }, 400);

    let durationMinutes = Number(body?.durationMinutes);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) durationMinutes = 60;
    durationMinutes = Math.min(480, Math.max(5, Math.round(durationMinutes)));

    let link;
    let source;
    let dailyRoomName = null;

    if (isDailyConfigured()) {
      try {
        const endDate = new Date(scheduledAt.getTime() + durationMinutes * 60_000);
        const dailyRoom = await createDailyRoom({ startDate: scheduledAt, endDate });
        link = dailyRoom.joinUrl;
        dailyRoomName = dailyRoom.roomName;
        source = "daily";
      } catch (err) {
        console.error("[/api/meetings] Daily auto-create failed, falling back:", err);
        if (!manualLink || !isValidHttpUrl(manualLink)) {
          return jsonResponse(
            { error: "daily_meeting_failed", message: "فشل إنشاء الاجتماع تلقائيًا عبر Daily — أرسل رابطًا يدويًا كبديل." },
            502
          );
        }
        link = manualLink;
        source = "manual";
      }
    } else {
      if (!manualLink || !isValidHttpUrl(manualLink)) return jsonResponse({ error: "invalid_link" }, 400);
      link = manualLink;
      source = "manual";
    }

    await connectToMongo();
    const Meeting = getMeetingModel();
    const created = await Meeting.create({
      course: null,
      teacher: session.user.id,
      title: title.slice(0, 200),
      description: description.slice(0, 2000),
      link,
      source,
      dailyRoomName,
      scheduledAt,
      durationMinutes,
    });

    // 🔔 إشعار داخل الموقع لكل المستخدمين المسجّلين (best-effort).
    // مفيش إيميل جماعي للجلسات العامة عن قصد (عدد المستخدمين ممكن يكون كبير).
    const allUserIds = (await getAllUserIds()).filter((id) => id !== String(session.user.id));
    if (allUserIds.length > 0) {
      await createNotificationsForUsers(allUserIds, {
        type: "meeting_scheduled",
        title: "محاضرة مباشرة جديدة للجميع",
        message: `${title} — ${scheduledAt.toLocaleString("ar-EG")}`,
        link: "/meet",
      });
    }

    return jsonResponse(
      {
        id: created._id.toString(),
        course: null,
        isGeneral: true,
        teacher: created.teacher.toString(),
        title: created.title,
        description: created.description || "",
        link: created.link,
        source: created.source || "manual",
        scheduledAt: created.scheduledAt,
        durationMinutes: created.durationMinutes,
        recordings: [],
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      },
      201
    );
  } catch (err) {
    console.error("[/api/meetings] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
// app/api/courses/[id]/meetings/route.js
//
// 🆕 محاضرات لايف (Teams) لكورس معيّن. نفس فلسفة app/api/courses/[id]/announcements
// بالظبط في فحص الصلاحيات:
//
// GET  /api/courses/[id]/meetings → اجتماعات الكورس، الأقرب زمنيًا أولًا.
//   صاحب الكورس/أدمن بيشوفهم دايمًا (بما فيهم كورس draft/pending — المدرس
//   يقدر يحضّر معاد المحاضرة قبل ما الكورس يتنشر أصلاً)، وأي حد تاني لازم
//   يكون عنده وصول فعلي (enrollment أو membership نشطة).
//
// POST /api/courses/[id]/meetings { title, link, scheduledAt, description?,
//   durationMinutes? } → صاحب الكورس/أدمن بس. بعد الإنشاء بيبعت إشعار
//   "meeting_scheduled" لكل طالب مسجّل فعليًا في الكورس (insertMany، مش loop).

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getMeetingModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { getCourseAccessForUser } from "@/app/lib/access";
import { createNotificationsForUsers, getEnrolledUserIds } from "@/app/lib/notificationHelpers";
import { enforceRateLimit } from "@/app/lib/rateLimit";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function serializeMeeting(m) {
  return {
    id: m._id.toString(),
    course: m.course.toString(),
    teacher: m.teacher.toString(),
    title: m.title,
    description: m.description || "",
    link: m.link,
    scheduledAt: m.scheduledAt,
    durationMinutes: m.durationMinutes,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

// 🔒 بنتحقق إن الرابط http(s) صالح بس — مش دومين معيّن (شوف تعليق
// app/lib/models/Meeting.js عن السبب). بيرفض أي حاجة مش رابط حقيقي (مثلاً
// نص عادي المدرس لزقه غلط) قبل ما توصل للداتابيز.
function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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
      if (!access.hasAccess) return jsonResponse({ error: "forbidden", reason: "enrollment_required" }, 403);
    }

    const Meeting = getMeetingModel();
    const meetings = await Meeting.find({ course: id }).sort({ scheduledAt: 1 }).lean();

    return jsonResponse({ meetings: meetings.map(serializeMeeting) });
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
    const title = String(body?.title || "").trim();
    const link = String(body?.link || "").trim();
    const description = String(body?.description || "").trim();

    if (!title) return jsonResponse({ error: "missing_title" }, 400);
    if (!link || !isValidHttpUrl(link)) return jsonResponse({ error: "invalid_link" }, 400);

    const scheduledAt = new Date(body?.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) return jsonResponse({ error: "invalid_scheduled_at" }, 400);

    let durationMinutes = Number(body?.durationMinutes);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) durationMinutes = 60;
    durationMinutes = Math.min(480, Math.max(5, Math.round(durationMinutes)));

    const Meeting = getMeetingModel();
    const created = await Meeting.create({
      course: id,
      teacher: session.user.id,
      title: title.slice(0, 200),
      description: description.slice(0, 2000),
      link,
      scheduledAt,
      durationMinutes,
    });

    // 🔔 best-effort — نفس فلسفة الإعلانات، فشل الإشعار مايوقفش نجاح إنشاء
    // الاجتماع نفسه (اللي نجح فعلًا فوق).
    const enrolledUserIds = await getEnrolledUserIds(id);
    if (enrolledUserIds.length > 0) {
      await createNotificationsForUsers(enrolledUserIds, {
        type: "meeting_scheduled",
        title: `محاضرة لايف جديدة على كورس ${course.title}`,
        message: `${title} — ${scheduledAt.toLocaleString("ar-EG")}`,
        link: "/meet",
        course: id,
      });
    }

    return jsonResponse(serializeMeeting(created), 201);
  } catch (err) {
    console.error("[/api/courses/[id]/meetings] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
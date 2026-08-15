// app/api/courses/[id]/announcements/route.js
//
// Phase 6 — اليوم 46-47: "Announcements: المدرس ينشر إعلان على الكورس،
// يظهر لكل الطلاب المسجلين". كان مفيش أي API route لموديل Announcement
// (app/lib/models/Announcement.js) خالص — الملف ده هو الربط الناقص.
//
// GET  /api/courses/[id]/announcements → إعلانات الكورس، الأحدث أولًا.
//   نفس منطق الوصول المستخدم في courses/[id]/sections: صاحب الكورس/أدمن
//   بيشوفهم دايمًا، وأي حد تاني لازم يكون عنده وصول فعلي (enrollment أو
//   membership نشطة — شوف app/lib/access.js) — الإعلانات مش محتوى preview
//   يتعرض لزوار.
//
// POST /api/courses/[id]/announcements { title, body } → صاحب الكورس/أدمن
//   بس. بعد الإنشاء، بينادي getEnrolledUserIds + createNotificationsForUsers
//   (app/lib/notificationHelpers.js) عشان يبعت إشعار "announcement_new"
//   لكل طالب مسجّل فعليًا في الكورس فورًا (insertMany دفعة واحدة، مش
//   loop) — ده هو نص المطلوب في اليوم 46-47 حرفيًا.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getAnnouncementModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { getCourseAccessForUser } from "@/app/lib/access";
import { createNotificationsForUsers, getEnrolledUserIds } from "@/app/lib/notificationHelpers";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function serializeAnnouncement(a) {
  return {
    id: a._id.toString(),
    course: a.course.toString(),
    title: a.title,
    body: a.body,
    createdAt: a.createdAt,
  };
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

    const Announcement = getAnnouncementModel();
    const announcements = await Announcement.find({ course: id }).sort({ createdAt: -1 }).lean();

    return jsonResponse({ announcements: announcements.map(serializeAnnouncement) });
  } catch (err) {
    console.error("[/api/courses/[id]/announcements] GET error:", err);
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

    const body = await request.json().catch(() => null);
    const title = String(body?.title || "").trim();
    const text = String(body?.body || "").trim();
    if (!title) return jsonResponse({ error: "missing_title" }, 400);
    if (!text) return jsonResponse({ error: "missing_body" }, 400);

    const Announcement = getAnnouncementModel();
    const created = await Announcement.create({
      course: id,
      teacher: session.user.id,
      title: title.slice(0, 200),
      body: text.slice(0, 5000),
    });

    // 🔔 Phase 6 — اليوم 50-51: إشعار داخلي لكل طالب مسجّل فعليًا (مش
    // أعضاء membership اللي مالهمش enrollment صريح — نفس تعريف
    // getEnrolledUserIds، شوف تعليقها في notificationHelpers.js).
    // best-effort بالكامل: فشل الإشعارات ميبوّظش إنشاء الإعلان نفسه، اللي
    // نجح فعلًا فوق.
    const enrolledUserIds = await getEnrolledUserIds(id);
    if (enrolledUserIds.length > 0) {
      await createNotificationsForUsers(enrolledUserIds, {
        type: "announcement_new",
        title: `إعلان جديد على كورس ${course.title}`,
        message: title,
        link: `/courses/${id}`,
        course: id,
      });
    }

    return jsonResponse(serializeAnnouncement(created), 201);
  } catch (err) {
    console.error("[/api/courses/[id]/announcements] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
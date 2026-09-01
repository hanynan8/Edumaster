// app/api/student/messages/route.js
//
// 🆕 صندوق وارد الطالب — قائمة كل الكورسات المسجّل فيها (enrollment فعلي،
// نفس مصدر GET /api/enrollments)، كل واحد مع مدرسه ومعاينة آخر رسالة (لو
// فيه محادثة بدأت أصلاً) وعدد الرسايل الغير مقروءة من المدرس. الطالب من
// هنا بيختار كورس/مدرس يبدأ أو يكمل معاه محادثة (GET/POST
// /api/courses/[id]/messages).
//
// GET /api/student/messages

import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getEnrollmentModel, getCourseModel, getMessageModel } from "@/app/lib/models";
import { requireRole } from "@/app/lib/rbac";
import { resolveSecureStoredUrl } from "@/app/lib/bunny";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET() {
  try {
    const auth = await requireRole(["student"]);
    if (auth.response) return auth.response;
    const { session } = auth;

    await connectToMongo();
    const Enrollment = getEnrollmentModel();
    const Course = getCourseModel();
    const Auth = getAuthModel();
    const Message = getMessageModel();

    const enrollments = await Enrollment.find({ user: session.user.id, status: { $ne: "cancelled" } }, "course")
      .sort({ createdAt: -1 })
      .lean();
    if (enrollments.length === 0) return jsonResponse({ threads: [] });

    const courseIds = [...new Set(enrollments.map((e) => e.course.toString()))];
    const courses = await Course.find({ _id: { $in: courseIds } }, "title teacher").lean();

    const teacherIds = [...new Set(courses.map((c) => c.teacher?.toString()).filter(Boolean))];
    const teachers = await Auth.find({ _id: { $in: teacherIds } }, "name profile.avatar").lean();
    const teacherById = new Map(teachers.map((t) => [t._id.toString(), t]));

    // آخر رسالة + عدد الغير مقروء (من المدرس) لكل كورس دفعة واحدة
    const previews = await Message.aggregate([
      { $match: { student: new (require("mongoose").Types.ObjectId)(session.user.id) } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$course",
          lastBody: { $first: "$body" },
          lastSenderIsStudent: { $first: { $eq: ["$sender", "$student"] } },
          lastAt: { $first: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [{ $and: [{ $eq: ["$isRead", false] }, { $ne: ["$sender", "$student"] }] }, 1, 0],
            },
          },
        },
      },
    ]);
    const previewByCourse = new Map(previews.map((p) => [p._id.toString(), p]));

    const threads = courses
      .map((c) => {
        const teacher = c.teacher ? teacherById.get(c.teacher.toString()) : null;
        const preview = previewByCourse.get(c._id.toString());
        return {
          courseId: c._id.toString(),
          courseTitle: c.title,
          teacherId: c.teacher ? c.teacher.toString() : null,
          teacherName: teacher?.name ?? null,
          teacherAvatar: resolveSecureStoredUrl(teacher?.profile?.avatar ?? null),
          lastMessage: preview?.lastBody ?? null,
          lastMessageFromStudent: preview?.lastSenderIsStudent ?? null,
          lastAt: preview?.lastAt ?? null,
          unreadCount: preview?.unreadCount ?? 0,
        };
      })
      // الأحدث نشاطًا الأول، وبعدهم الكورسات اللي لسه ماتبدأش فيها محادثة
      .sort((a, b) => {
        if (a.lastAt && b.lastAt) return new Date(b.lastAt) - new Date(a.lastAt);
        if (a.lastAt) return -1;
        if (b.lastAt) return 1;
        return 0;
      });

    return jsonResponse({ threads });
  } catch (err) {
    console.error("[/api/student/messages] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
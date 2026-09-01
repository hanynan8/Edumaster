// app/api/teacher/messages/route.js
//
// 🆕 صندوق وارد المدرس — قائمة كل "الخيوط" (محادثة طالب واحد + كورس واحد)
// اللي وصلته فيها رسايل، أحدث نشاط الأول، مع عدد الرسايل الغير مقروءة في
// كل خيط. المدرس بيشوف خيوطه هو بس (teacher = session.user.id على كل
// رسالة، متسيّبة denormalized في Message.js بالظبط عشان الاستعلام ده يبقى
// مباشر من غير join مع courses). أدمن بيشوف كل الخيوط على المنصة (oversight).
//
// GET /api/teacher/messages

import mongoose from "mongoose";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getMessageModel, getCourseModel } from "@/app/lib/models";
import { requireRole } from "@/app/lib/rbac";
import { resolveSecureStoredUrl } from "@/app/lib/bunny";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(request) {
  try {
    const auth = await requireRole(["teacher", "admin"]);
    if (auth.response) return auth.response;
    const { session } = auth;

    await connectToMongo();
    const Message = getMessageModel();

    const match =
      session.user.role === "admin" ? {} : { teacher: new mongoose.Types.ObjectId(session.user.id) };

    const threads = await Message.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { course: "$course", student: "$student" },
          teacher: { $first: "$teacher" },
          lastBody: { $first: "$body" },
          lastSenderIsStudent: { $first: { $eq: ["$sender", "$student"] } },
          lastAt: { $first: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [{ $and: [{ $eq: ["$isRead", false] }, { $eq: ["$sender", "$student"] }] }, 1, 0],
            },
          },
        },
      },
      { $sort: { lastAt: -1 } },
      { $limit: 200 },
    ]);

    if (threads.length === 0) return jsonResponse({ threads: [] });

    const courseIds = [...new Set(threads.map((t) => t._id.course.toString()))];
    const studentIds = [...new Set(threads.map((t) => t._id.student.toString()))];

    const Course = getCourseModel();
    const Auth = getAuthModel();
    const [courses, students] = await Promise.all([
      Course.find({ _id: { $in: courseIds } }, "title").lean(),
      Auth.find({ _id: { $in: studentIds } }, "name profile.avatar").lean(),
    ]);
    const courseById = new Map(courses.map((c) => [c._id.toString(), c]));
    const studentById = new Map(students.map((s) => [s._id.toString(), s]));

    return jsonResponse({
      threads: threads.map((t) => {
        const courseId = t._id.course.toString();
        const studentId = t._id.student.toString();
        const course = courseById.get(courseId);
        const student = studentById.get(studentId);
        return {
          courseId,
          courseTitle: course?.title ?? null,
          studentId,
          studentName: student?.name ?? null,
          studentAvatar: resolveSecureStoredUrl(student?.profile?.avatar ?? null),
          lastMessage: t.lastBody,
          lastMessageFromStudent: t.lastSenderIsStudent,
          lastAt: t.lastAt,
          unreadCount: t.unreadCount,
        };
      }),
    });
  } catch (err) {
    console.error("[/api/teacher/messages] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
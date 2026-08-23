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
// مفيش POST هنا عن قصد — الإنشاء بيتم من خلال
// app/api/courses/[id]/meetings (POST) لأنه محتاج فحص ownership على
// الكورس نفسه، مش على "أي كورس المدرس يختاره" من غير تحقق.

import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getMeetingModel, getCourseModel, getEnrollmentModel } from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";
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
    course: m.course?._id ? m.course._id.toString() : m.course?.toString(),
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

    if (session.user.role === "teacher") {
      query.teacher = session.user.id;
    } else if (session.user.role === "student") {
      const Enrollment = getEnrollmentModel();
      const enrollments = await Enrollment.find(
        { user: session.user.id, status: { $ne: "cancelled" } },
        "course"
      ).lean();
      const courseIds = enrollments.map((e) => e.course);
      if (courseIds.length === 0) {
        return jsonResponse({ meetings: [] });
      }
      query.course = { $in: courseIds };
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
// app/api/lessons/[id]/complete/route.js
//
// Phase 4 — اليوم 42: تحديد درس (غير-كويز؛ فيديو/pdf/نص) كـ "مكتمل" بواسطة
// الطالب — الزرار في صفحة الكورس (app/(pages)/courses/[id]/page.jsx) بينده
// هنا لما الطالب يخلّص الدرس. دروس النوع "quiz" بتتحسب مكتملة تلقائيًا من
// نجاح الكويز المرتبط بيها (شوف app/api/quizzes/[id]/attempt) مش من هنا.
//
// 🔒 لازم enrollment/membership access فعلية على الكورس، وإلا مفيش داعي
// نسجّل تقدّم لحد أصلاً مالوش وصول للمحتوى.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getLessonModel, getEnrollmentModel } from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";
import { getCourseAccessForUser } from "@/app/lib/access";
import { recomputeEnrollmentProgress } from "@/app/lib/progressHelpers";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    await connectToMongo();
    const Lesson = getLessonModel();
    const lesson = await Lesson.findById(id).lean();
    if (!lesson) return jsonResponse({ error: "not_found" }, 404);

    if (lesson.type === "quiz") {
      // 🔒 دروس الكويز بتتحسب مكتملة من نتيجة الكويز، مش من هنا — منعًا
      // لطالب يعمل "complete" مباشرة من غير ما يحل الكويز فعليًا.
      return jsonResponse({ error: "quiz_lesson_completes_via_quiz" }, 400);
    }

    // لو صاحب الكورس بيعاين محتواه، من غير enrollment — مفيش تقدّم يتسجل
    const access = await getCourseAccessForUser({ userId: session.user.id, courseId: lesson.course });
    if (!access.hasAccess) return jsonResponse({ error: "forbidden" }, 403);

    const Enrollment = getEnrollmentModel();
    // idempotent: $addToSet مش بيكرر لو الطالب ضغط "مكتمل" أكتر من مرة
    await Enrollment.updateOne(
      { user: session.user.id, course: lesson.course },
      { $addToSet: { completedLessons: lesson._id }, $set: { lastAccessedLesson: lesson._id } }
    );

    const enrollment = await recomputeEnrollmentProgress(session.user.id, lesson.course);

    return jsonResponse({
      completed: true,
      progressPercent: enrollment?.progressPercent ?? 0,
      courseCompleted: enrollment?.status === "completed",
    });
  } catch (err) {
    console.error("[/api/lessons/[id]/complete] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
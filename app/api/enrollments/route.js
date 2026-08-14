// app/api/enrollments/route.js
//
// اليوم 13/15: صفحة تفاصيل الكورس العامة (app/(pages)/courses/[id]/page.jsx)
// كانت بتندي على GET/POST هنا من زمان عشان تعرف "هل الطالب مسجّل؟" وتسجّله،
// لكن الراوت نفسه مكانش موجود خالص — يعني زرار "اشترك" كان هيفشل دايمًا.
// ده بيضيفه، بنفس الـ error shape اللي الصفحة بتتوقعه بالظبط
// (payment_required / cannot_enroll_own_course).
//
// GET  /api/enrollments?course=<id>  → { enrolled, enrollment } لكورس واحد
// GET  /api/enrollments              → كل تسجيلات المستخدم الحالي (My courses)
// POST /api/enrollments { course }   → يسجّل المستخدم الحالي في كورس مجاني
//      (كورس مدفوع لسه معندناش مسار دفع، فبيرجع 402 payment_required —
//      الأدمن يقدر يسجّل الطالب يدويًا بـ source="admin_grant" لاحقًا لو احتاج)

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getEnrollmentModel, getCourseModel } from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function serializeEnrollment(e) {
  return {
    id: e._id.toString(),
    user: e.user?.toString?.() ?? e.user,
    course: e.course?.toString?.() ?? e.course,
    source: e.source,
    status: e.status,
    progressPercent: e.progressPercent,
    completedLessons: (e.completedLessons || []).map((l) => l.toString?.() ?? l),
    lastAccessedLesson: e.lastAccessedLesson ? e.lastAccessedLesson.toString?.() ?? e.lastAccessedLesson : null,
    completedAt: e.completedAt,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

export async function GET(request) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    await connectToMongo();
    const Enrollment = getEnrollmentModel();

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("course");

    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return jsonResponse({ error: "invalid_course" }, 400);
      }
      const enrollment = await Enrollment.findOne({ user: session.user.id, course: courseId }).lean();
      return jsonResponse({
        enrolled: Boolean(enrollment),
        enrollment: enrollment ? serializeEnrollment(enrollment) : null,
      });
    }

    // مفيش ?course= → رجّع كل تسجيلات المستخدم (لصفحة "كورساتي" مستقبلًا)
    const enrollments = await Enrollment.find({ user: session.user.id })
      .sort({ createdAt: -1 })
      .lean();
    return jsonResponse({ enrollments: enrollments.map(serializeEnrollment) });
  } catch (err) {
    console.error("[/api/enrollments] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function POST(request) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = await request.json().catch(() => null);
    const courseId = body?.course;
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return jsonResponse({ error: "invalid_course" }, 400);
    }

    await connectToMongo();
    const Course = getCourseModel();
    const Enrollment = getEnrollmentModel();

    const course = await Course.findById(courseId);
    // مش هنسرّب وجود كورس draft/archived لغير المسموح لهم — 404 موحّدة
    if (!course || course.status !== "published") {
      return jsonResponse({ error: "not_found" }, 404);
    }

    // 🔒 المدرس صاحب الكورس (أو أي مدرس آخر بنفس الـ id) ميقدرش "يشترك" في
    // كورسه هو — مفيش داعي، وده بيلخبط studentsCount.
    if (String(course.teacher) === String(session.user.id)) {
      return jsonResponse({ error: "cannot_enroll_own_course" }, 409);
    }

    const existing = await Enrollment.findOne({ user: session.user.id, course: courseId }).lean();
    if (existing) {
      // idempotent: لو مسجل بالفعل، رجّع نجاح بدل خطأ — زرار "اشترك" ميتضغطش
      // غالبًا مرتين، لكن لو حصل (double click / retry) مفيش داعي نفشل.
      return jsonResponse({ enrolled: true, enrollment: serializeEnrollment(existing) });
    }

    // كورسات مدفوعة: لسه معندناش مسار دفع إلكتروني (Phase قادمة). بنرجّع
    // خطأ واضح بدل ما نسجّل الطالب من غير ما يدفع فعليًا.
    if (!course.isFree) {
      return jsonResponse({ error: "payment_required" }, 402);
    }

    let created;
    try {
      created = await Enrollment.create({
        user: session.user.id,
        course: courseId,
        source: "free",
        status: "active",
      });
    } catch (err) {
      // 🔒 race condition: لو ضغط "اشترك" مرتين بسرعة، الـ unique index على
      // (user, course) هيرفض التاني — مش خطأ حقيقي، يبقى هو أصلاً اتسجل.
      if (err?.code === 11000) {
        const already = await Enrollment.findOne({ user: session.user.id, course: courseId }).lean();
        if (already) return jsonResponse({ enrolled: true, enrollment: serializeEnrollment(already) });
      }
      throw err;
    }

    // ✅ إحصائية محسوبة على الكورس — بتتحدث هنا بس (الكود)، مش من الـ client
    await Course.findByIdAndUpdate(courseId, { $inc: { studentsCount: 1 } });

    return jsonResponse({ enrolled: true, enrollment: serializeEnrollment(created) }, 201);
  } catch (err) {
    console.error("[/api/enrollments] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
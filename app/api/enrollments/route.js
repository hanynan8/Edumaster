// app/api/enrollments/route.js
//
// اليوم 13/15: صفحة تفاصيل الكورس العامة (app/(pages)/courses/[id]/page.jsx)
// كانت بتندي على GET/POST هنا من زمان عشان تعرف "هل الطالب مسجّل؟" وتسجّله،
// لكن الراوت نفسه مكانش موجود خالص — يعني زرار "اشترك" كان هيفشل دايمًا.
// ده بيضيفه، بنفس الـ error shape اللي الصفحة بتتوقعه بالظبط
// (payment_required / cannot_enroll_own_course).
//
// GET  /api/enrollments?course=<id>  → { enrolled, enrollment, hasAccess,
//        accessSource } لكورس واحد. hasAccess ممكن يبقى true حتى لو
//        enrolled=false — عضو membership نشطة عنده وصول للمحتوى فورًا من
//        غير ما يعمل enroll صريح (شوف app/lib/access.js)، الـ UI بيستخدم
//        accessSource ليعرض "متضمّن في اشتراكك" بدل زرار "اشترك".
//
// GET  /api/enrollments              → كل تسجيلات المستخدم الحالي، بعد ما
//        نضيفلها بيانات الكورس الأساسية (عنوان/thumbnail/slug) — عشان صفحة
//        "My Courses" (اليوم 20-21) تعرضها من غير ما تعمل N+1 fetch لكل كورس.
//
// POST /api/enrollments { course }   → Phase 2 اليوم 18-19: يسجّل المستخدم
//        الحالي في الكورس عن طريق واحد من مصدرين:
//        - كورس مجاني (isFree)              → source="free"
//        - كورس مدفوع + membership تغطّيه   → source="membership"
//        - كورس مدفوع + مفيش membership     → 402 payment_required (لسه
//          معندناش مسار دفع مباشر — الأدمن يقدر يسجّل الطالب يدويًا
//          بـ source="admin_grant" لاحقًا لو احتاج، Phase 3)
//        منع تسجيل مكرر: idempotent (لو مسجل بالفعل بيرجع نجاح) + unique
//        index على (user, course) في الموديل نفسه كخط دفاع ثاني ضد race
//        conditions.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getEnrollmentModel, getCourseModel } from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";
import { getCourseAccessForUser, hasActiveMembershipAccessToCourse } from "@/app/lib/access";
// Phase 6 — اليوم 50-51: إشعار للمدرس لما طالب جديد يسجّل في كورسه.
import { createNotification } from "@/app/lib/notificationHelpers";
import { enforceRateLimit } from "@/app/lib/rateLimit";

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
    course: e.course?._id ? e.course._id.toString() : e.course?.toString?.() ?? e.course,
    source: e.source,
    status: e.status,
    progressPercent: e.progressPercent,
    completedLessons: (e.completedLessons || []).map((l) => l.toString?.() ?? l),
    lastAccessedLesson: e.lastAccessedLesson ? e.lastAccessedLesson.toString?.() ?? e.lastAccessedLesson : null,
    completedAt: e.completedAt,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    // موجودة بس لو الـ course اتعمله populate (شوف GET من غير ?course=)
    courseTitle: e.course?.title,
    courseSlug: e.course?.slug,
    courseThumbnail: e.course?.thumbnail,
    courseTotalLessonsCount: e.course?.totalLessonsCount,
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
      const access = await getCourseAccessForUser({ userId: session.user.id, courseId });
      return jsonResponse({
        enrolled: access.isEnrolled,
        enrollment: access.enrollment ? serializeEnrollment(access.enrollment) : null,
        hasAccess: access.hasAccess,
        accessSource: access.isEnrolled ? "enrollment" : access.hasMembershipAccess ? "membership" : null,
      });
    }

    // مفيش ?course= → رجّع كل تسجيلات المستخدم مع بيانات الكورس الأساسية
    // (لصفحة "My Courses" — app/student/page.jsx)
    const enrollments = await Enrollment.find({ user: session.user.id })
      .populate("course", "title slug thumbnail totalLessonsCount status")
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

    // 🔒 SECURITY (Day 59): يمنع سكربت من محاولة enroll في مئات الكورسات
    // بسرعة (سبام إشعارات للمدرسين + ضغط على studentsCount $inc).
    const rl = await enforceRateLimit(request, {
      keyPrefix: "enrollments:create",
      limit: 20,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

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

    // 🔒 Phase 2 — اليوم 18-19: كورس مجاني → source="free". كورس مدفوع →
    // نتحقق الأول هل عنده membership نشطة بتغطي الكورس ده، ولو آه نسجّله
    // source="membership" (حتى لو ما فتحش المحتوى من قبل — ده أول Enrollment
    // صريح ليه، بيتستخدم لتتبع التقدّم progressPercent). غير كده 402.
    let source;
    if (course.isFree) {
      source = "free";
    } else if (await hasActiveMembershipAccessToCourse(session.user.id, courseId)) {
      source = "membership";
    } else {
      return jsonResponse({ error: "payment_required" }, 402);
    }

    let created;
    try {
      created = await Enrollment.create({
        user: session.user.id,
        course: courseId,
        source,
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

    // 🔔 Phase 6 — اليوم 50-51: "تسجيل جديد" هي أول حالة مذكورة في المهمة
    // (جرس إشعارات — عند تسجيل جديد). best-effort (createNotification
    // بتمسك أي خطأ جوّاها) — فشل الإشعار ميبوّظش نجاح التسجيل نفسه.
    await createNotification({
      user: course.teacher,
      type: "enrollment_new",
      title: "طالب جديد سجّل في كورسك",
      message: `${session.user.name || "طالب"} سجّل في "${course.title}"`,
      link: `/teacher/courses/${course._id}`,
      course: course._id,
    });

    return jsonResponse({ enrolled: true, enrollment: serializeEnrollment(created) }, 201);
  } catch (err) {
    console.error("[/api/enrollments] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
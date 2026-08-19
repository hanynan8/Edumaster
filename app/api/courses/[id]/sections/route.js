// app/api/courses/[id]/sections/route.js
//
// اليوم 7: GET بترجع شجرة الأقسام + الدروس بتاعة كورس معيّن (مستخدمة في
// شجرة الـ Teacher Dashboard اليوم 10، وهتتستخدم برضو في صفحة عرض الكورس
// العامة بعدين). نفس منطق الحماية بتاع GET /api/courses/[id]: لو الكورس
// draft، الأقسام بتظهر لصاحبها/الأدمن بس. لو published، بتظهر للكل لكن
// بمحتوى محدود لغير الأصحاب-الوصول (شوف gating المحتوى تحت).
//
// 🔒 Phase 2 — اليوم 22: "الأصحاب-وصول" بقت enrollment فعلي *أو* membership
// نشطة بتغطي الكورس ده (شوف app/lib/access.js) — مش بس enrollment زي الأول.
// عضو خطة Pro مثلاً يقدر يفتح محتوى الكورس على طول من غير ما يعمل enroll
// صريح، لأن الفحص real-time على كل request مش معتمد على وجود سجل Enrollment.
//
// POST: إضافة section جديدة — صاحب الكورس/أدمن بس.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getSectionModel, getLessonModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { getCourseAccessForUser } from "@/app/lib/access";
import { resolveSecureLessonMediaUrls } from "@/app/lib/bunny";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function serializeLesson(l, { revealProtectedContent }) {
  const base = {
    id: l._id.toString(),
    title: l.title,
    type: l.type,
    durationSeconds: l.durationSeconds,
    isPreview: l.isPreview,
    order: l.order,
    // Phase 4 — اليوم 42: درس النوع "quiz" بيربط بمستند Quiz منفصل (شوف
    // app/lib/models/Lesson.js) — بنسرّب الـ id بس هنا (مش محتوى الكويز
    // نفسه) عشان الواجهة تعرف تودّي لصفحة /student/quizzes/[quizId].
    quiz: l.quiz ? l.quiz.toString() : null,
  };
  // 🔒 محتوى الدرس الفعلي (رابط الفيديو/الملف/النص) بيتسرّب بس لو الدرس
  // preview، أو صاحب الكورس/أدمن بيشوفه في لوحته، أو الطالب عنده وصول فعلي
  // (enrollment أو membership نشطة — revealProtectedContent محسوبة فوق).
  if (revealProtectedContent || l.isPreview) {
    // 🔒 Day 62: الرابط اللي بيتسرّب هنا موقّع ومؤقت لو Token Authentication
    // مفعّلة (شوف app/lib/bunny.js) — عشان حتى لو حد اخد الرابط من الشبكة
    // وشاركه، يبقى منتهي الصلاحية بعد كام ساعة مش قابل لإعادة الاستخدام
    // للأبد زي الرابط العام الخام.
    const secure = resolveSecureLessonMediaUrls({
      videoUrl: l.videoUrl,
      videoProvider: l.videoProvider,
      fileUrl: l.fileUrl,
    });
    base.videoUrl = secure.videoUrl;
    base.videoProvider = l.videoProvider;
    base.fileUrl = secure.fileUrl;
    base.textContent = l.textContent;
  }
  return base;
}

async function loadCourseAndCheckAccess(courseId) {
  const Course = getCourseModel();
  const course = await Course.findById(courseId).lean();
  if (!course) return { course: null, canManage: false, hasAccess: false };

  if (course.status === "published") {
    // ممكن لسه نحتاج نعرف canManage/hasAccess عشان نظهر المحتوى الكامل
    // (للمالك أو لطالب عنده وصول فعلي)، من غير ما نمنع الزوار من أصل الطلب
    const auth = await requireSession();
    const canManage = !auth.response && isOwnerOrAdmin(auth.session, course.teacher);
    // 🔒 لو صاحب الكورس أصلاً، مفيش داعي نفحص enrollment/membership (وهو
    // مش enrolled فيه عمليًا لأن /api/enrollments بيرفض تسجيل صاحب الكورس
    // في كورسه هو)
    const hasAccess =
      !canManage && !auth.response
        ? (await getCourseAccessForUser({ userId: auth.session.user.id, courseId })).hasAccess
        : false;
    return { course, canManage, hasAccess };
  }

  // draft/archived: لازم صلاحية (owner/admin بس، مفيش enrollment/membership
  // ممكن أصلاً لكورس مش منشور)
  const auth = await requireSession();
  if (auth.response) return { course: null, canManage: false, hasAccess: false };
  if (!isOwnerOrAdmin(auth.session, course.teacher)) return { course: null, canManage: false, hasAccess: false };
  return { course, canManage: true, hasAccess: false };
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const { course, canManage, hasAccess } = await loadCourseAndCheckAccess(id);
    if (!course) return jsonResponse({ error: "not_found" }, 404);

    const Section = getSectionModel();
    const Lesson = getLessonModel();

    const sections = await Section.find({ course: id }).sort({ order: 1 }).lean();
    const lessons = await Lesson.find({ course: id }).sort({ order: 1 }).lean();

    const revealProtectedContent = canManage || hasAccess;
    const lessonsBySection = new Map();
    for (const lesson of lessons) {
      const key = lesson.section.toString();
      if (!lessonsBySection.has(key)) lessonsBySection.set(key, []);
      lessonsBySection.get(key).push(serializeLesson(lesson, { revealProtectedContent }));
    }

    return jsonResponse(
      sections.map((s) => ({
        id: s._id.toString(),
        title: s.title,
        description: s.description,
        order: s.order,
        lessons: lessonsBySection.get(s._id.toString()) || [],
      }))
    );
  } catch (err) {
    console.error("[/api/courses/[id]/sections] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const Course = getCourseModel();
    const course = await Course.findById(id).lean();
    if (!course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!isOwnerOrAdmin(auth.session, course.teacher)) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const body = await request.json().catch(() => null);
    const title = String(body?.title || "").trim();
    if (!title) return jsonResponse({ error: "missing_title" }, 400);

    const Section = getSectionModel();

    // ترتيب افتراضي: آخر section + 1، إلا لو المدرس بعت order صريح
    let order = Number.isFinite(body?.order) ? body.order : null;
    if (order === null) {
      const count = await Section.countDocuments({ course: id });
      order = count;
    }

    const created = await Section.create({
      course: id,
      title,
      description: String(body?.description || ""),
      order,
    });

    return jsonResponse(
      {
        id: created._id.toString(),
        title: created.title,
        description: created.description,
        order: created.order,
        lessons: [],
      },
      201
    );
  } catch (err) {
    console.error("[/api/courses/[id]/sections] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
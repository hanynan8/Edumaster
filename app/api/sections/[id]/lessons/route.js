// app/api/sections/[id]/lessons/route.js
//
// اليوم 8: إضافة/عرض دروس جوه section معيّنة. الدرس بياخد video/pdf/text
// (والرابط الفعلي بييجي من رفع منفصل على Cloudinary — شوف
// /api/upload/signature — مش بيتبعت كملف هنا، بس رابطه بعد الرفع).
//
// 🔒 Phase 2 — اليوم 22 (تصحيح ثغرة): الـ GET هنا كان بيرجّع videoUrl/
// fileUrl/textContent كاملين لأي حد طالما الكورس published — من غير أي فحص
// enrollment ولا membership، حتى لو الدرس مش isPreview. ده كان بيسمح لأي
// زائر (مسجل دخول أو حتى غير مسجل) إنه يقرا محتوى كورس مدفوع كامل عن طريق
// النداء المباشر على الـ endpoint ده، بدل ما يمر على GET
// /api/courses/[id]/sections اللي فيه الفحص الصحيح. اتصلح بنفس منطق
// app/lib/access.js (نفس المصدر المستخدم في courses/[id]/sections) —
// الحقول المحمية بترجع بس لو owner/admin أو enrollment/membership فعلية أو
// الدرس نفسه preview.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getSectionModel, getLessonModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { recomputeCourseTotals } from "@/app/lib/courseHelpers";
import { getCourseAccessForUser } from "@/app/lib/access";
import { resolveSecureLessonMediaUrls } from "@/app/lib/bunny";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const ALLOWED_TYPES = ["video", "pdf", "text", "quiz"];
const ALLOWED_VIDEO_PROVIDERS = ["youtube", "vimeo", "bunny", "s3", "cloudinary", "other"];

// 🔒 نفس فكرة serializeLesson في courses/[id]/sections/route.js: الحقول
// المحمية (videoUrl/videoProvider/fileUrl/textContent) بترجع بس لو
// revealProtectedContent=true أو الدرس preview — غير كده بترجع البيانات
// الوصفية بس (عنوان/نوع/مدة) عشان الـ UI يقدر يعرض قائمة الدروس مقفولة.
function serializeLesson(l, { revealProtectedContent }) {
  const base = {
    id: l._id.toString(),
    section: l.section.toString(),
    course: l.course.toString(),
    title: l.title,
    type: l.type,
    durationSeconds: l.durationSeconds,
    isPreview: l.isPreview,
    order: l.order,
  };
  if (revealProtectedContent || l.isPreview) {
    // 🔒 Day 62: نفس منطق courses/[id]/sections — رابط موقّع ومؤقت لو
    // Token Authentication مفعّلة، بدل الرابط العام الدائم.
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

async function loadSectionWithCourse(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return { section: null, course: null };
  const Section = getSectionModel();
  const Course = getCourseModel();
  const section = await Section.findById(id).lean();
  if (!section) return { section: null, course: null };
  const course = await Course.findById(section.course);
  return { section, course };
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await connectToMongo();
    const { section, course } = await loadSectionWithCourse(id);
    if (!section || !course) return jsonResponse({ error: "not_found" }, 404);

    // نفس منطق الظهور بتاع GET /api/courses/[id]/sections: لو draft لازم
    // تكون صاحب الكورس/أدمن
    let canManage = false;
    let hasAccess = false;
    if (course.status !== "published") {
      const auth = await requireSession();
      if (auth.response || !isOwnerOrAdmin(auth.session, course.teacher)) {
        return jsonResponse({ error: "not_found" }, 404);
      }
      canManage = true;
    } else {
      const auth = await requireSession();
      canManage = !auth.response && isOwnerOrAdmin(auth.session, course.teacher);
      // 🔒 لو مش صاحب/أدمن، افحص enrollment/membership فعلية زي
      // app/lib/access.js بالظبط قبل ما نسرّب أي حقل محمي
      if (!canManage && !auth.response) {
        hasAccess = (
          await getCourseAccessForUser({ userId: auth.session.user.id, courseId: course._id })
        ).hasAccess;
      }
    }

    const revealProtectedContent = canManage || hasAccess;

    const Lesson = getLessonModel();
    const lessons = await Lesson.find({ section: id }).sort({ order: 1 }).lean();
    return jsonResponse(lessons.map((l) => serializeLesson(l, { revealProtectedContent })));
  } catch (err) {
    console.error("[/api/sections/[id]/lessons] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    await connectToMongo();
    const { section, course } = await loadSectionWithCourse(id);
    if (!section || !course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!isOwnerOrAdmin(auth.session, course.teacher)) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const body = await request.json().catch(() => null);
    const title = String(body?.title || "").trim();
    if (!title) return jsonResponse({ error: "missing_title" }, 400);

    const type = ALLOWED_TYPES.includes(body?.type) ? body.type : "video";

    // 🔒 تحقق بسيط حسب النوع: فيديو لازم videoUrl، ملف لازم fileUrl، نص لازم
    // textContent — منعًا لدرس فاضي بيوهم إنه جاهز
    if (type === "video" && !body?.videoUrl) {
      return jsonResponse({ error: "missing_video_url" }, 400);
    }
    if (type === "pdf" && !body?.fileUrl) {
      return jsonResponse({ error: "missing_file_url" }, 400);
    }
    if (type === "text" && !String(body?.textContent || "").trim()) {
      return jsonResponse({ error: "missing_text_content" }, 400);
    }

    const videoProvider = ALLOWED_VIDEO_PROVIDERS.includes(body?.videoProvider)
      ? body.videoProvider
      : type === "video"
      ? "cloudinary"
      : null;

    const Lesson = getLessonModel();
    let order = Number.isFinite(body?.order) ? body.order : null;
    if (order === null) {
      order = await Lesson.countDocuments({ section: id });
    }

    const created = await Lesson.create({
      section: id,
      course: course._id,
      title,
      type,
      videoUrl: type === "video" ? body.videoUrl : null,
      videoProvider: type === "video" ? videoProvider : null,
      durationSeconds: Math.max(0, Number(body?.durationSeconds) || 0),
      fileUrl: type === "pdf" ? body.fileUrl : null,
      textContent: type === "text" ? String(body.textContent) : null,
      isPreview: Boolean(body?.isPreview),
      order,
    });

    await recomputeCourseTotals(course._id);

    return jsonResponse(serializeLesson(created, { revealProtectedContent: true }), 201);
  } catch (err) {
    console.error("[/api/sections/[id]/lessons] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
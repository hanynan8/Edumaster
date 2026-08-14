// app/api/sections/[id]/lessons/route.js
//
// اليوم 8: إضافة/عرض دروس جوه section معيّنة. الدرس بياخد video/pdf/text
// (والرابط الفعلي بييجي من رفع منفصل على Cloudinary — شوف
// /api/upload/signature — مش بيتبعت كملف هنا، بس رابطه بعد الرفع).

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getSectionModel, getLessonModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { recomputeCourseTotals } from "@/app/lib/courseHelpers";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const ALLOWED_TYPES = ["video", "pdf", "text", "quiz"];
const ALLOWED_VIDEO_PROVIDERS = ["youtube", "vimeo", "bunny", "s3", "cloudinary", "other"];

function serializeLesson(l) {
  return {
    id: l._id.toString(),
    section: l.section.toString(),
    course: l.course.toString(),
    title: l.title,
    type: l.type,
    videoUrl: l.videoUrl,
    videoProvider: l.videoProvider,
    durationSeconds: l.durationSeconds,
    fileUrl: l.fileUrl,
    textContent: l.textContent,
    isPreview: l.isPreview,
    order: l.order,
  };
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
    if (course.status !== "published") {
      const auth = await requireSession();
      if (auth.response || !isOwnerOrAdmin(auth.session, course.teacher)) {
        return jsonResponse({ error: "not_found" }, 404);
      }
    }

    const Lesson = getLessonModel();
    const lessons = await Lesson.find({ section: id }).sort({ order: 1 }).lean();
    return jsonResponse(lessons.map(serializeLesson));
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

    return jsonResponse(serializeLesson(created), 201);
  } catch (err) {
    console.error("[/api/sections/[id]/lessons] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

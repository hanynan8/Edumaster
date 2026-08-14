// app/api/lessons/[id]/route.js
//
// تعديل/حذف/عرض درس واحد. زي الـ sections، الصلاحية بتتحقق عن طريق الكورس
// اللي الدرس تابع له (lesson.course.teacher).

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getLessonModel } from "@/app/lib/models";
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

async function loadLessonWithCourse(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return { lesson: null, course: null };
  const Lesson = getLessonModel();
  const Course = getCourseModel();
  const lesson = await Lesson.findById(id);
  if (!lesson) return { lesson: null, course: null };
  const course = await Course.findById(lesson.course);
  return { lesson, course };
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await connectToMongo();
    const { lesson, course } = await loadLessonWithCourse(id);
    if (!lesson || !course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    const canManage = !auth.response && isOwnerOrAdmin(auth.session, course.teacher);

    if (course.status !== "published" && !canManage) {
      return jsonResponse({ error: "not_found" }, 404);
    }
    // 🔒 محتوى الدرس المحمي بيظهر بس لصاحب الكورس/أدمن أو لو الدرس preview.
    // طالب مسجّل فعليًا (enrollment) هيتضاف الشرط ده في Phase 2.
    if (!canManage && !lesson.isPreview) {
      return jsonResponse({ error: "forbidden", reason: "enrollment_required" }, 403);
    }

    return jsonResponse(serializeLesson(lesson));
  } catch (err) {
    console.error("[/api/lessons/[id]] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    await connectToMongo();
    const { lesson, course } = await loadLessonWithCourse(id);
    if (!lesson || !course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!isOwnerOrAdmin(auth.session, course.teacher)) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const body = await request.json().catch(() => null);
    if (!body) return jsonResponse({ error: "invalid_body" }, 400);

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return jsonResponse({ error: "invalid_title" }, 400);
      lesson.title = title;
    }
    if (body.type !== undefined) {
      if (!ALLOWED_TYPES.includes(body.type)) return jsonResponse({ error: "invalid_type" }, 400);
      lesson.type = body.type;
    }
    if (body.videoUrl !== undefined) lesson.videoUrl = body.videoUrl || null;
    if (body.videoProvider !== undefined) {
      lesson.videoProvider = ALLOWED_VIDEO_PROVIDERS.includes(body.videoProvider)
        ? body.videoProvider
        : null;
    }
    if (body.durationSeconds !== undefined) {
      lesson.durationSeconds = Math.max(0, Number(body.durationSeconds) || 0);
    }
    if (body.fileUrl !== undefined) lesson.fileUrl = body.fileUrl || null;
    if (body.textContent !== undefined) lesson.textContent = body.textContent || null;
    if (body.isPreview !== undefined) lesson.isPreview = Boolean(body.isPreview);
    if (body.order !== undefined && Number.isFinite(body.order)) lesson.order = body.order;

    await lesson.save();
    await recomputeCourseTotals(course._id);

    return jsonResponse(serializeLesson(lesson));
  } catch (err) {
    console.error("[/api/lessons/[id]] PUT error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await connectToMongo();
    const { lesson, course } = await loadLessonWithCourse(id);
    if (!lesson || !course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!isOwnerOrAdmin(auth.session, course.teacher)) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    await lesson.deleteOne();
    await recomputeCourseTotals(course._id);

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[/api/lessons/[id]] DELETE error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
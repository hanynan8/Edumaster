// app/api/assignments/route.js
//
// Phase 4 — اليوم 37-38: "Teacher: إنشاء Assignment (وصف + مرفقات + Deadline)".
//
// GET  /api/assignments?course=<id> → قائمة واجبات كورس معيّن. صاحب
//        الكورس/أدمن بيشوف الكل (منشور+مسودة)، غير كده منشور بس.
// POST /api/assignments { course, title, description?, attachmentUrl?,
//        section?, lesson?, dueDate?, maxScore?, allowLateSubmission? }
//        → صاحب الكورس أو أدمن بس.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getAssignmentModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function serializeAssignment(a) {
  return {
    id: a._id.toString(),
    course: a.course?.toString?.() ?? a.course,
    section: a.section ? a.section.toString() : null,
    lesson: a.lesson ? a.lesson.toString() : null,
    title: a.title,
    description: a.description,
    attachmentUrl: a.attachmentUrl,
    dueDate: a.dueDate,
    maxScore: a.maxScore,
    allowLateSubmission: a.allowLateSubmission,
    isPublished: a.isPublished,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("course");
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return jsonResponse({ error: "invalid_course" }, 400);
    }

    await connectToMongo();
    const Course = getCourseModel();
    const course = await Course.findById(courseId).lean();
    if (!course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    const canManage = !auth.response && isOwnerOrAdmin(auth.session, course.teacher);

    const Assignment = getAssignmentModel();
    const query = { course: courseId };
    if (!canManage) query.isPublished = true;

    const assignments = await Assignment.find(query).sort({ createdAt: -1 }).lean();
    return jsonResponse({ assignments: assignments.map(serializeAssignment) });
  } catch (err) {
    console.error("[/api/assignments] GET error:", err);
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
    const title = String(body?.title || "").trim();
    if (!title) return jsonResponse({ error: "missing_title" }, 400);

    await connectToMongo();
    const Course = getCourseModel();
    const course = await Course.findById(courseId);
    if (!course) return jsonResponse({ error: "not_found" }, 404);
    if (!isOwnerOrAdmin(session, course.teacher)) return jsonResponse({ error: "forbidden" }, 403);

    if (body?.section && !mongoose.Types.ObjectId.isValid(body.section)) {
      return jsonResponse({ error: "invalid_section" }, 400);
    }
    if (body?.lesson && !mongoose.Types.ObjectId.isValid(body.lesson)) {
      return jsonResponse({ error: "invalid_lesson" }, 400);
    }

    const Assignment = getAssignmentModel();
    const created = await Assignment.create({
      course: courseId,
      section: body.section || null,
      lesson: body.lesson || null,
      title,
      description: String(body?.description || ""),
      attachmentUrl: body?.attachmentUrl || null,
      dueDate: body?.dueDate ? new Date(body.dueDate) : null,
      maxScore: Number.isFinite(Number(body?.maxScore)) ? Math.max(1, Number(body.maxScore)) : 100,
      allowLateSubmission: body?.allowLateSubmission !== undefined ? Boolean(body.allowLateSubmission) : true,
      isPublished: Boolean(body?.isPublished),
    });

    return jsonResponse(serializeAssignment(created), 201);
  } catch (err) {
    console.error("[/api/assignments] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
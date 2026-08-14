// app/api/assignments/[id]/route.js
//
// Phase 4 — اليوم 37-38/39-40.
//
// GET /api/assignments/[id] → تفاصيل واجب واحد. الطالب لازم يكون عنده
//   وصول للكورس والواجب منشور؛ صاحب الكورس/أدمن بيشوف أي حالة.
// PUT/DELETE → صاحب الكورس أو أدمن بس. الحذف بيشيل معاه كل تسليمات
//   الطلاب (منعًا لسجلات يتيمة).

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getAssignmentModel, getSubmissionModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { getCourseAccessForUser } from "@/app/lib/access";

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

async function loadAssignmentWithCourse(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return { assignment: null, course: null };
  const Assignment = getAssignmentModel();
  const Course = getCourseModel();
  const assignment = await Assignment.findById(id);
  if (!assignment) return { assignment: null, course: null };
  const course = await Course.findById(assignment.course);
  return { assignment, course };
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await connectToMongo();
    const { assignment, course } = await loadAssignmentWithCourse(id);
    if (!assignment || !course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const canManage = isOwnerOrAdmin(session, course.teacher);
    if (!canManage) {
      if (!assignment.isPublished) return jsonResponse({ error: "not_found" }, 404);
      const access = await getCourseAccessForUser({ userId: session.user.id, courseId: course._id });
      if (!access.hasAccess) return jsonResponse({ error: "forbidden" }, 403);
    }

    const result = serializeAssignment(assignment);

    // لو طالب، ضيف حالة تسليمه هو بس (لو موجود) عشان صفحة تسليم الواجب
    // تعرف تعرض "اتسلم بالفعل" ولا "لسه"
    if (!canManage) {
      const Submission = getSubmissionModel();
      const mySubmission = await Submission.findOne({ assignment: assignment._id, student: session.user.id }).lean();
      result.mySubmission = mySubmission
        ? {
            id: mySubmission._id.toString(),
            fileUrl: mySubmission.fileUrl,
            textAnswer: mySubmission.textAnswer,
            status: mySubmission.status,
            score: mySubmission.score,
            feedback: mySubmission.feedback,
            submittedAt: mySubmission.submittedAt,
            gradedAt: mySubmission.gradedAt,
          }
        : null;
    }

    return jsonResponse(result);
  } catch (err) {
    console.error("[/api/assignments/[id]] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    await connectToMongo();
    const { assignment, course } = await loadAssignmentWithCourse(id);
    if (!assignment || !course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!isOwnerOrAdmin(auth.session, course.teacher)) return jsonResponse({ error: "forbidden" }, 403);

    const body = await request.json().catch(() => null);
    if (body?.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return jsonResponse({ error: "missing_title" }, 400);
      assignment.title = title;
    }
    if (body?.description !== undefined) assignment.description = String(body.description);
    if (body?.attachmentUrl !== undefined) assignment.attachmentUrl = body.attachmentUrl || null;
    if (body?.dueDate !== undefined) assignment.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body?.maxScore !== undefined) assignment.maxScore = Math.max(1, Number(body.maxScore) || 1);
    if (body?.allowLateSubmission !== undefined) assignment.allowLateSubmission = Boolean(body.allowLateSubmission);
    if (body?.isPublished !== undefined) assignment.isPublished = Boolean(body.isPublished);
    if (body?.section !== undefined) {
      assignment.section = body.section && mongoose.Types.ObjectId.isValid(body.section) ? body.section : null;
    }
    if (body?.lesson !== undefined) {
      assignment.lesson = body.lesson && mongoose.Types.ObjectId.isValid(body.lesson) ? body.lesson : null;
    }

    await assignment.save();
    return jsonResponse(serializeAssignment(assignment));
  } catch (err) {
    console.error("[/api/assignments/[id]] PUT error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await connectToMongo();
    const { assignment, course } = await loadAssignmentWithCourse(id);
    if (!assignment || !course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!isOwnerOrAdmin(auth.session, course.teacher)) return jsonResponse({ error: "forbidden" }, 403);

    const Submission = getSubmissionModel();
    await Promise.all([Submission.deleteMany({ assignment: assignment._id }), assignment.deleteOne()]);

    return jsonResponse({ deleted: true });
  } catch (err) {
    console.error("[/api/assignments/[id]] DELETE error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
// app/api/assignments/[id]/submissions/[submissionId]/route.js
//
// Phase 4 — اليوم 39-40: "Teacher: تصحيح يدوي + درجة + Feedback" — تصحيح
// تسليم واحد بعينه.
//
// PUT /api/assignments/[id]/submissions/[submissionId] { score, feedback? }
//   → صاحب الكورس أو أدمن بس. بيحدّث score/feedback/status="graded"/
//   gradedBy/gradedAt. الدرجة لازم تكون بين 0 و maxScore بتاع الواجب.
//
// GET نفس المسار مش مستخدم من الواجهة حاليًا (المدرس بيشوف كل التسليمات
// مع بعض من GET /api/assignments/[id]/submissions) — سايبينه هنا بس
// كاختصار لتسليم واحد لو احتجناه لاحقًا.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getAssignmentModel, getSubmissionModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function loadContext(assignmentId, submissionId) {
  if (!mongoose.Types.ObjectId.isValid(assignmentId) || !mongoose.Types.ObjectId.isValid(submissionId)) {
    return { assignment: null, course: null, submission: null };
  }
  const Assignment = getAssignmentModel();
  const Course = getCourseModel();
  const Submission = getSubmissionModel();

  const assignment = await Assignment.findById(assignmentId).lean();
  if (!assignment) return { assignment: null, course: null, submission: null };
  const course = await Course.findById(assignment.course).lean();
  const submission = await Submission.findOne({ _id: submissionId, assignment: assignmentId });
  return { assignment, course, submission };
}

export async function GET(request, { params }) {
  try {
    const { id, submissionId } = await params;
    await connectToMongo();
    const { assignment, course, submission } = await loadContext(id, submissionId);
    if (!assignment || !course || !submission) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;
    const canManage = isOwnerOrAdmin(session, course.teacher);
    // 🔒 الطالب صاحب التسليم يقدر يشوفه هو بس؛ غير كده صاحب الكورس/أدمن
    if (!canManage && String(session.user.id) !== String(submission.student)) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    return jsonResponse({
      id: submission._id.toString(),
      fileUrl: submission.fileUrl,
      textAnswer: submission.textAnswer,
      status: submission.status,
      score: submission.score,
      feedback: submission.feedback,
      submittedAt: submission.submittedAt,
      gradedAt: submission.gradedAt,
    });
  } catch (err) {
    console.error("[/api/assignments/[id]/submissions/[submissionId]] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id, submissionId } = await params;
    await connectToMongo();
    const { assignment, course, submission } = await loadContext(id, submissionId);
    if (!assignment || !course || !submission) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;
    if (!isOwnerOrAdmin(session, course.teacher)) return jsonResponse({ error: "forbidden" }, 403);

    const body = await request.json().catch(() => null);
    const score = Number(body?.score);
    if (!Number.isFinite(score) || score < 0 || score > assignment.maxScore) {
      return jsonResponse({ error: "invalid_score", maxScore: assignment.maxScore }, 400);
    }

    submission.score = score;
    submission.feedback = body?.feedback !== undefined ? String(body.feedback || "") : submission.feedback;
    submission.status = "graded";
    submission.gradedBy = session.user.id;
    submission.gradedAt = new Date();
    await submission.save();

    return jsonResponse({
      id: submission._id.toString(),
      score: submission.score,
      feedback: submission.feedback,
      status: submission.status,
      gradedAt: submission.gradedAt,
    });
  } catch (err) {
    console.error("[/api/assignments/[id]/submissions/[submissionId]] PUT error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
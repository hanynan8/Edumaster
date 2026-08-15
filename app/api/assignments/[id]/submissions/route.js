// app/api/assignments/[id]/submissions/route.js
//
// Phase 4 — اليوم 39-40: "Student: تسليم Assignment (رفع ملف) + Teacher:
// تصحيح يدوي + درجة + Feedback".
//
// GET  /api/assignments/[id]/submissions → قائمة كل تسليمات الطلاب لواجب
//        معيّن (اسم/إيميل الطالب + الملف/النص + حالة التصحيح). صاحب الكورس
//        أو أدمن بس (شوف app/teacher/assignments/[assignmentId]/submissions).
//
// POST /api/assignments/[id]/submissions { fileUrl?, textAnswer? } → تسليم
//        الطالب لنفسه. لازم يكون عنده وصول فعلي للكورس والواجب منشور.
//        🔒 SECURITY: تسليم واحد لكل طالب لكل واجب (unique index في
//        Submission model) — إعادة الإرسال بتعدّل نفس السجل (upsert) بدل ما
//        تنشئ نسخة تانية، وبترجّعه لحالة "submitted"/"late" تاني (يمسح أي
//        تصحيح سابق) عشان المدرس يعرف إنه محتاج يراجعه تاني.
//        لو allowLateSubmission=false وفات الميعاد، السيرفر بيرفض التسليم.

import mongoose from "mongoose";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getCourseModel, getAssignmentModel, getSubmissionModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { getCourseAccessForUser } from "@/app/lib/access";
import { enforceRateLimit } from "@/app/lib/rateLimit";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function serializeSubmissionForTeacher(s, studentById) {
  const student = studentById[s.student.toString()];
  return {
    id: s._id.toString(),
    studentId: s.student.toString(),
    studentName: student?.name || "—",
    studentEmail: student?.email || "—",
    fileUrl: s.fileUrl,
    textAnswer: s.textAnswer,
    status: s.status,
    score: s.score,
    feedback: s.feedback,
    submittedAt: s.submittedAt,
    gradedAt: s.gradedAt,
  };
}

async function loadAssignmentWithCourse(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return { assignment: null, course: null };
  const Assignment = getAssignmentModel();
  const Course = getCourseModel();
  const assignment = await Assignment.findById(id).lean();
  if (!assignment) return { assignment: null, course: null };
  const course = await Course.findById(assignment.course).lean();
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
    if (!isOwnerOrAdmin(auth.session, course.teacher)) return jsonResponse({ error: "forbidden" }, 403);

    const Submission = getSubmissionModel();
    const submissions = await Submission.find({ assignment: assignment._id }).sort({ submittedAt: -1 }).lean();

    const AuthModel = getAuthModel();
    const students = await AuthModel.find(
      { _id: { $in: submissions.map((s) => s.student) } },
      "name email"
    ).lean();
    const studentById = Object.fromEntries(students.map((st) => [st._id.toString(), st]));

    return jsonResponse({
      assignmentTitle: assignment.title,
      courseTitle: course.title,
      maxScore: assignment.maxScore,
      submissions: submissions.map((s) => serializeSubmissionForTeacher(s, studentById)),
    });
  } catch (err) {
    console.error("[/api/assignments/[id]/submissions] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    await connectToMongo();
    const { assignment, course } = await loadAssignmentWithCourse(id);
    if (!assignment || !course) return jsonResponse({ error: "not_found" }, 404);
    if (!assignment.isPublished) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    // 🔒 لازم وصول فعلي للكورس (enrollment/membership) قبل ما يسلّم أي واجب
    const access = await getCourseAccessForUser({ userId: session.user.id, courseId: course._id });
    if (!access.hasAccess) return jsonResponse({ error: "forbidden" }, 403);

    // 🔒 SECURITY (Day 59)
    const rl = await enforceRateLimit(request, {
      keyPrefix: "assignments:submit",
      limit: 10,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    const body = await request.json().catch(() => null);
    const fileUrl = body?.fileUrl ? String(body.fileUrl) : null;
    const textAnswer = body?.textAnswer ? String(body.textAnswer) : null;
    if (!fileUrl && !textAnswer) {
      return jsonResponse({ error: "empty_submission" }, 400);
    }

    const now = new Date();
    const isLate = Boolean(assignment.dueDate && now.getTime() > new Date(assignment.dueDate).getTime());
    if (isLate && !assignment.allowLateSubmission) {
      return jsonResponse({ error: "deadline_passed" }, 400);
    }

    const Submission = getSubmissionModel();
    // 🔒 upsert بدل create — تسليم واحد بس لكل (طالب، واجب). إعادة تسليم
    // بعد ما اتصحح بترجّعه "submitted"/"late" تاني وتمسح الدرجة/الفيدباك
    // القدام (تصحيح قديم بيبقى مش مرتبط بمحتوى جديد).
    const saved = await Submission.findOneAndUpdate(
      { assignment: assignment._id, student: session.user.id },
      {
        $set: {
          fileUrl,
          textAnswer,
          submittedAt: now,
          status: isLate ? "late" : "submitted",
          score: null,
          feedback: null,
          gradedBy: null,
          gradedAt: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return jsonResponse(
      {
        id: saved._id.toString(),
        fileUrl: saved.fileUrl,
        textAnswer: saved.textAnswer,
        status: saved.status,
        submittedAt: saved.submittedAt,
        score: saved.score,
        feedback: saved.feedback,
      },
      201
    );
  } catch (err) {
    console.error("[/api/assignments/[id]/submissions] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
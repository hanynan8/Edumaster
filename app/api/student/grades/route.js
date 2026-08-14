// app/api/student/grades/route.js
//
// Phase 4 — اليوم 41: "صفحة درجاتي ونتائجي للطالب" — كل نتائج الكويزات
// ودرجات الواجبات بتاعة الطالب الحالي، مجمّعة حسب الكورس. بيرجع بس
// الكورسات اللي الطالب مسجّل/عنده وصول فيها فعليًا (من واقع Enrollment).
//
// GET /api/student/grades → أي مستخدم مسجّل دخول (بياخد بياناته هو بس).

import { connectToMongo } from "@/app/lib/mongodb";
import {
  getCourseModel,
  getEnrollmentModel,
  getQuizModel,
  getQuizResultModel,
  getAssignmentModel,
  getSubmissionModel,
} from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET() {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    await connectToMongo();
    const Enrollment = getEnrollmentModel();
    const enrollments = await Enrollment.find({ user: session.user.id }).lean();
    if (enrollments.length === 0) return jsonResponse({ courses: [] });

    const courseIds = enrollments.map((e) => e.course);
    const Course = getCourseModel();
    const Quiz = getQuizModel();
    const QuizResult = getQuizResultModel();
    const Assignment = getAssignmentModel();
    const Submission = getSubmissionModel();

    const [courses, quizzes, quizResults, assignments, submissions] = await Promise.all([
      Course.find({ _id: { $in: courseIds } }, "title").lean(),
      Quiz.find({ course: { $in: courseIds }, isPublished: true }).lean(),
      QuizResult.find({ student: session.user.id, course: { $in: courseIds } }).lean(),
      Assignment.find({ course: { $in: courseIds }, isPublished: true }).lean(),
      Submission.find({ student: session.user.id }).lean(),
    ]);

    const courseById = Object.fromEntries(courses.map((c) => [c._id.toString(), c]));
    const enrollmentByCourse = Object.fromEntries(enrollments.map((e) => [e.course.toString(), e]));

    const quizzesByCourse = new Map();
    for (const q of quizzes) {
      const key = q.course.toString();
      if (!quizzesByCourse.has(key)) quizzesByCourse.set(key, []);
      quizzesByCourse.get(key).push(q);
    }
    const assignmentsByCourse = new Map();
    for (const a of assignments) {
      const key = a.course.toString();
      if (!assignmentsByCourse.has(key)) assignmentsByCourse.set(key, []);
      assignmentsByCourse.get(key).push(a);
    }

    // أفضل نتيجة لكل كويز
    const bestByQuiz = new Map();
    for (const r of quizResults) {
      const key = r.quiz.toString();
      const existing = bestByQuiz.get(key);
      if (!existing || r.scorePercent > existing.scorePercent) bestByQuiz.set(key, r);
    }
    const attemptsCountByQuiz = new Map();
    for (const r of quizResults) {
      const key = r.quiz.toString();
      attemptsCountByQuiz.set(key, (attemptsCountByQuiz.get(key) || 0) + 1);
    }
    const submissionByAssignment = new Map(submissions.map((s) => [s.assignment.toString(), s]));

    const result = courseIds
      .map((cid) => cid.toString())
      .filter((cid, idx, arr) => arr.indexOf(cid) === idx) // unique
      .map((cid) => {
        const course = courseById[cid];
        if (!course) return null;
        const enrollment = enrollmentByCourse[cid];

        const courseQuizzes = (quizzesByCourse.get(cid) || []).map((q) => {
          const best = bestByQuiz.get(q._id.toString());
          return {
            quizId: q._id.toString(),
            title: q.title,
            maxAttempts: q.maxAttempts,
            passingScorePercent: q.passingScorePercent,
            attemptsUsed: attemptsCountByQuiz.get(q._id.toString()) || 0,
            bestScorePercent: best ? best.scorePercent : null,
            passed: best ? best.passed : null,
          };
        });

        const courseAssignments = (assignmentsByCourse.get(cid) || []).map((a) => {
          const s = submissionByAssignment.get(a._id.toString());
          return {
            assignmentId: a._id.toString(),
            title: a.title,
            maxScore: a.maxScore,
            dueDate: a.dueDate,
            submitted: Boolean(s),
            status: s?.status || null,
            score: s?.score ?? null,
            feedback: s?.feedback ?? null,
          };
        });

        return {
          courseId: cid,
          courseTitle: course.title,
          progressPercent: enrollment?.progressPercent || 0,
          status: enrollment?.status || "active",
          quizzes: courseQuizzes,
          assignments: courseAssignments,
        };
      })
      .filter(Boolean);

    return jsonResponse({ courses: result });
  } catch (err) {
    console.error("[/api/student/grades] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
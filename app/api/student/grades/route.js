// app/api/student/grades/route.js
//
// Phase 4 — اليوم 41: "صفحة درجاتي ونتائجي للطالب" — كل نتائج الكويزات
// ودرجات الواجبات بتاعة الطالب الحالي، مجمّعة حسب الكورس. بيرجع بس
// الكورسات اللي الطالب مسجّل/عنده وصول فيها فعليًا (من واقع Enrollment).
//
// GET /api/student/grades → أي مستخدم مسجّل دخول (بياخد بياناته هو بس).
//
// قواعد الحساب (progressMath.js — نفس اللي بتستخدمه صفحات المدرس):
//   - نسبة الإكمال بتتحسب حيًّا من الدروس/الكويزات الحالية.
//   - أفضل نتيجة كويز بتتجاهل المحاولات المعلّقة (pending_review) — درجتها مؤقتة
//     و passed=false لحد ما المقالي يتصحح — وبيتبعت pendingReview عشان الصفحة
//     تعرض "قيد التصحيح". attemptsUsed بيعدّ كل المحاولات (المعلّقة كمان) لأنها
//     بتستهلك من maxAttempts فعلاً.

import { connectToMongo } from "@/app/lib/mongodb";
import {
  getCourseModel,
  getEnrollmentModel,
  getLessonModel,
  getQuizModel,
  getQuizResultModel,
  getAssignmentModel,
  getSubmissionModel,
} from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";
import { computeProgress, pickBestQuizResult } from "@/app/lib/progressMath";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function pushTo(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
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
    const Lesson = getLessonModel();
    const Quiz = getQuizModel();
    const QuizResult = getQuizResultModel();
    const Assignment = getAssignmentModel();
    const Submission = getSubmissionModel();

    const [courses, nonQuizLessons, quizzes, quizResults, assignments, submissions] = await Promise.all([
      Course.find({ _id: { $in: courseIds } }, "title").lean(),
      Lesson.find({ course: { $in: courseIds }, type: { $ne: "quiz" } }, "course").lean(),
      Quiz.find({ course: { $in: courseIds }, isPublished: true }).lean(),
      QuizResult.find(
        { student: session.user.id, course: { $in: courseIds } },
        "quiz course scorePercent passed status"
      ).lean(),
      Assignment.find({ course: { $in: courseIds }, isPublished: true }).lean(),
      Submission.find({ student: session.user.id }).lean(),
    ]);

    const courseById = Object.fromEntries(courses.map((c) => [c._id.toString(), c]));
    const enrollmentByCourse = Object.fromEntries(enrollments.map((e) => [e.course.toString(), e]));

    const lessonIdsByCourse = new Map();
    for (const l of nonQuizLessons) pushTo(lessonIdsByCourse, l.course.toString(), l._id);

    const quizzesByCourse = new Map();
    for (const q of quizzes) pushTo(quizzesByCourse, q.course.toString(), q);

    const assignmentsByCourse = new Map();
    for (const a of assignments) pushTo(assignmentsByCourse, a.course.toString(), a);

    // كل محاولات الطالب لكل كويز
    const attemptsByQuiz = new Map();
    for (const r of quizResults) pushTo(attemptsByQuiz, r.quiz.toString(), r);

    const submissionByAssignment = new Map(submissions.map((s) => [s.assignment.toString(), s]));

    const result = courseIds
      .map((cid) => cid.toString())
      .filter((cid, idx, arr) => arr.indexOf(cid) === idx) // unique
      .map((cid) => {
        const course = courseById[cid];
        if (!course) return null;
        const enrollment = enrollmentByCourse[cid];
        const publishedQuizzes = quizzesByCourse.get(cid) || [];

        const courseQuizzes = publishedQuizzes.map((q) => {
          const attempts = attemptsByQuiz.get(q._id.toString()) || [];
          const { best, hasPendingReview, attemptsCount } = pickBestQuizResult(attempts);
          return {
            quizId: q._id.toString(),
            title: q.title,
            maxAttempts: q.maxAttempts,
            passingScorePercent: q.passingScorePercent,
            attemptsUsed: attemptsCount,
            bestScorePercent: best ? best.scorePercent : null,
            passed: best ? Boolean(best.passed) : null,
            pendingReview: hasPendingReview,
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

        // نسبة الإكمال حيّة: الكويز المنجوح = أي محاولة ناجحة (مش لازم الأفضل)
        const passedQuizIds = publishedQuizzes
          .filter((q) => (attemptsByQuiz.get(q._id.toString()) || []).some((r) => r.passed))
          .map((q) => q._id);
        const progress = computeProgress({
          nonQuizLessonIds: lessonIdsByCourse.get(cid) || [],
          publishedQuizIds: publishedQuizzes.map((q) => q._id),
          completedLessonIds: enrollment?.completedLessons || [],
          passedQuizIds,
        });

        return {
          courseId: cid,
          courseTitle: course.title,
          progressPercent: progress.progressPercent,
          status: enrollment?.status === "cancelled" ? "cancelled" : progress.isComplete ? "completed" : "active",
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

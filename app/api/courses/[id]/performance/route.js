// app/api/courses/[id]/performance/route.js
//
// Phase 4 — اليوم 41: "صفحة أداء الطلاب للمدرس" — نظرة شاملة على كل طالب
// مسجّل في الكورس: نسبة إكماله، نتايجه في كل كويز، ودرجاته في كل واجب.
//
// GET /api/courses/[id]/performance → صاحب الكورس أو أدمن/موديريتور بس.
//
// قواعد الحساب (كلها في app/lib/progressMath.js عشان نفس الرقم يطلع في كل مكان):
//   - نسبة الإكمال بتتحسب "حيّة" هنا من الدروس/الكويزات الحالية، مش بتتاخد من
//     enrollment.progressPercent المخزّنة (اللي ممكن تكون قديمة لو المحتوى اتغيّر).
//   - أفضل نتيجة كويز بتتجاهل المحاولات المعلّقة (pending_review)، وبتتبعت
//     علامة pendingReview عشان الصفحة تعرض "قيد التصحيح".
//   - التسجيلات الملغية (cancelled) مش بتظهر ومش بتتعدّ في عدد الطلاب.

import mongoose from "mongoose";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import {
  getCourseModel,
  getEnrollmentModel,
  getLessonModel,
  getQuizModel,
  getQuizResultModel,
  getAssignmentModel,
  getSubmissionModel,
} from "@/app/lib/models";
import { requireSession, isOwnerOrStaff } from "@/app/lib/rbac";
import { computeProgress, pickBestQuizResult } from "@/app/lib/progressMath";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(request, { params }) {
  try {
    // 🔒 الـ session الأول: غير المسجّل ياخد 401 بغض النظر عن وجود الكورس،
    // فمفيش تسريب لوجود/عدم وجود كورس بمعرّف معيّن.
    const auth = await requireSession();
    if (auth.response) return auth.response;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_course" }, 400);

    await connectToMongo();
    const Course = getCourseModel();
    const course = await Course.findById(id).lean();
    if (!course) return jsonResponse({ error: "not_found" }, 404);
    if (!isOwnerOrStaff(auth.session, course.teacher)) return jsonResponse({ error: "forbidden" }, 403);

    const Enrollment = getEnrollmentModel();
    const Lesson = getLessonModel();
    const Quiz = getQuizModel();
    const QuizResult = getQuizResultModel();
    const Assignment = getAssignmentModel();
    const Submission = getSubmissionModel();
    const AuthModel = getAuthModel();

    const [enrollments, nonQuizLessons, quizzes, assignments] = await Promise.all([
      // 🔒 الملغي (cancelled) ملوش وصول للكورس → مش بيظهر في أداء الطلاب
      Enrollment.find({ course: id, status: { $ne: "cancelled" } }).sort({ createdAt: 1 }).lean(),
      Lesson.find({ course: id, type: { $ne: "quiz" } }, "_id").lean(),
      Quiz.find({ course: id, isPublished: true }, "title").lean(),
      Assignment.find({ course: id, isPublished: true }, "title maxScore").lean(),
    ]);

    const quizzesOut = quizzes.map((q) => ({ id: q._id.toString(), title: q.title }));
    const assignmentsOut = assignments.map((a) => ({ id: a._id.toString(), title: a.title, maxScore: a.maxScore }));

    if (enrollments.length === 0) {
      return jsonResponse({
        courseTitle: course.title,
        quizzes: quizzesOut,
        assignments: assignmentsOut,
        students: [],
      });
    }

    const studentIds = enrollments.map((e) => e.user);
    const quizIds = quizzes.map((q) => q._id);
    const assignmentIds = assignments.map((a) => a._id);
    const nonQuizLessonIds = nonQuizLessons.map((l) => l._id);

    const [students, quizResults, submissions] = await Promise.all([
      AuthModel.find({ _id: { $in: studentIds } }, "name email").lean(),
      // projection خفيف: مش محتاجين answers/messages (ممكن تكون كبيرة)
      quizIds.length > 0
        ? QuizResult.find(
            { course: id, quiz: { $in: quizIds }, student: { $in: studentIds } },
            "student quiz scorePercent passed status"
          ).lean()
        : [],
      assignmentIds.length > 0
        ? Submission.find({ assignment: { $in: assignmentIds }, student: { $in: studentIds } }).lean()
        : [],
    ]);
    const studentById = Object.fromEntries(students.map((s) => [s._id.toString(), s]));

    // كل محاولات كل (طالب، كويز)
    const attemptsByKey = new Map(); // `${studentId}:${quizId}` → result[]
    // والكويزات اللي كل طالب نجح فيها (أي محاولة ناجحة) — لحساب التقدّم
    const passedQuizIdsByStudent = new Map(); // studentId → quizId[]
    for (const r of quizResults) {
      const studentId = r.student.toString();
      const key = `${studentId}:${r.quiz.toString()}`;
      if (!attemptsByKey.has(key)) attemptsByKey.set(key, []);
      attemptsByKey.get(key).push(r);

      if (r.passed) {
        if (!passedQuizIdsByStudent.has(studentId)) passedQuizIdsByStudent.set(studentId, []);
        passedQuizIdsByStudent.get(studentId).push(r.quiz);
      }
    }

    const submissionByKey = new Map(submissions.map((s) => [`${s.student.toString()}:${s.assignment.toString()}`, s]));

    const rows = enrollments.map((e) => {
      const studentId = e.user.toString();
      const info = studentById[studentId];

      const quizResultsForStudent = quizzes.map((q) => {
        const { best, hasPendingReview } = pickBestQuizResult(attemptsByKey.get(`${studentId}:${q._id.toString()}`) || []);
        return {
          quizId: q._id.toString(),
          // "اتحاول" = فيه نتيجة متصححة أو محاولة مستنية تصحيح
          attempted: Boolean(best) || hasPendingReview,
          bestScorePercent: best ? best.scorePercent : null,
          passed: best ? Boolean(best.passed) : null,
          pendingReview: hasPendingReview,
        };
      });

      const assignmentGradesForStudent = assignments.map((a) => {
        const s = submissionByKey.get(`${studentId}:${a._id.toString()}`);
        return {
          assignmentId: a._id.toString(),
          submitted: Boolean(s),
          status: s?.status || null,
          score: s?.score ?? null,
        };
      });

      const progress = computeProgress({
        nonQuizLessonIds,
        publishedQuizIds: quizIds,
        completedLessonIds: e.completedLessons || [],
        passedQuizIds: passedQuizIdsByStudent.get(studentId) || [],
      });

      return {
        studentId,
        studentName: info?.name || "—",
        studentEmail: info?.email || "—",
        progressPercent: progress.progressPercent,
        // الحالة مشتقة من نفس الحساب الحي (مش من الحقل المخزّن اللي ممكن يكون قديم)
        status: progress.isComplete ? "completed" : "active",
        // عدد الدروس (غير-الكويز) اللي الطالب كمّلها فعلاً من دروس الكورس الحالية
        completedLessonsCount: progress.completedLessonItems,
        quizResults: quizResultsForStudent,
        assignmentGrades: assignmentGradesForStudent,
      };
    });

    // ترتيب أبجدي عربي/إنجليزي ثابت (من غير ما يعتمد على لغة السيرفر)
    rows.sort((a, b) => a.studentName.localeCompare(b.studentName, "ar"));

    return jsonResponse({
      courseTitle: course.title,
      quizzes: quizzesOut,
      assignments: assignmentsOut,
      students: rows,
    });
  } catch (err) {
    console.error("[/api/courses/[id]/performance] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

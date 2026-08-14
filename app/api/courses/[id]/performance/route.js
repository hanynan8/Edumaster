// app/api/courses/[id]/performance/route.js
//
// Phase 4 — اليوم 41: "صفحة أداء الطلاب للمدرس" — نظرة شاملة على كل طالب
// مسجّل في الكورس: نسبة إكماله، نتايجه في كل كويز، ودرجاته في كل واجب.
//
// GET /api/courses/[id]/performance → صاحب الكورس أو أدمن بس.

import mongoose from "mongoose";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import {
  getCourseModel,
  getEnrollmentModel,
  getQuizModel,
  getQuizResultModel,
  getAssignmentModel,
  getSubmissionModel,
} from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_course" }, 400);

    await connectToMongo();
    const Course = getCourseModel();
    const course = await Course.findById(id).lean();
    if (!course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!isOwnerOrAdmin(auth.session, course.teacher)) return jsonResponse({ error: "forbidden" }, 403);

    const Enrollment = getEnrollmentModel();
    const Quiz = getQuizModel();
    const QuizResult = getQuizResultModel();
    const Assignment = getAssignmentModel();
    const Submission = getSubmissionModel();
    const AuthModel = getAuthModel();

    const [enrollments, quizzes, assignments] = await Promise.all([
      Enrollment.find({ course: id }).sort({ createdAt: 1 }).lean(),
      Quiz.find({ course: id, isPublished: true }, "title").lean(),
      Assignment.find({ course: id, isPublished: true }, "title maxScore").lean(),
    ]);

    if (enrollments.length === 0) {
      return jsonResponse({
        courseTitle: course.title,
        quizzes: quizzes.map((q) => ({ id: q._id.toString(), title: q.title })),
        assignments: assignments.map((a) => ({ id: a._id.toString(), title: a.title, maxScore: a.maxScore })),
        students: [],
      });
    }

    const studentIds = enrollments.map((e) => e.user);
    const quizIds = quizzes.map((q) => q._id);
    const assignmentIds = assignments.map((a) => a._id);

    const [students, quizResults, submissions] = await Promise.all([
      AuthModel.find({ _id: { $in: studentIds } }, "name email").lean(),
      QuizResult.find({ course: id, quiz: { $in: quizIds } }).lean(),
      Submission.find({ assignment: { $in: assignmentIds }, student: { $in: studentIds } }).lean(),
    ]);
    const studentById = Object.fromEntries(students.map((s) => [s._id.toString(), s]));

    // أفضل نتيجة لكل (طالب، كويز)
    const bestQuizResult = new Map(); // key: `${studentId}:${quizId}` → result
    for (const r of quizResults) {
      const key = `${r.student.toString()}:${r.quiz.toString()}`;
      const existing = bestQuizResult.get(key);
      if (!existing || r.scorePercent > existing.scorePercent) bestQuizResult.set(key, r);
    }

    const submissionByKey = new Map(submissions.map((s) => [`${s.student.toString()}:${s.assignment.toString()}`, s]));

    const rows = enrollments.map((e) => {
      const studentId = e.user.toString();
      const info = studentById[studentId];

      const quizResultsForStudent = quizzes.map((q) => {
        const r = bestQuizResult.get(`${studentId}:${q._id.toString()}`);
        return {
          quizId: q._id.toString(),
          attempted: Boolean(r),
          bestScorePercent: r ? r.scorePercent : null,
          passed: r ? r.passed : null,
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

      return {
        studentId,
        studentName: info?.name || "—",
        studentEmail: info?.email || "—",
        progressPercent: e.progressPercent || 0,
        status: e.status,
        completedLessonsCount: (e.completedLessons || []).length,
        quizResults: quizResultsForStudent,
        assignmentGrades: assignmentGradesForStudent,
      };
    });

    rows.sort((a, b) => a.studentName.localeCompare(b.studentName));

    return jsonResponse({
      courseTitle: course.title,
      quizzes: quizzes.map((q) => ({ id: q._id.toString(), title: q.title })),
      assignments: assignments.map((a) => ({ id: a._id.toString(), title: a.title, maxScore: a.maxScore })),
      students: rows,
    });
  } catch (err) {
    console.error("[/api/courses/[id]/performance] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
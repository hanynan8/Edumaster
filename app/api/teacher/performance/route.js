// app/api/teacher/performance/route.js
//
// Phase 7 — اليوم 55-56: "Teacher Dashboard: أداء كل كورس (عدد الطلاب،
// Completion Rate، متوسط الدرجات)". كان فيه بالفعل GET
// /api/courses/[id]/performance (Phase 4 — اليوم 41) بس ده تفصيل *لكورس
// واحد* (كل طالب وكل نتيجة كويز/واجب بتاعته على حدة) — مفيش نظرة *مُجمّعة*
// عبر كل كورسات المدرس مع بعض. الـ route ده بيسدّ الفجوة دي: صف واحد
// ملخّص لكل كورس (studentsCount, completionRate, avgGrade)، مناسب لعرض
// سريع/رسم بياني مقارنة بين الكورسات، بدل ما المدرس يفتح كل كورس لوحده.
//
// GET /api/teacher/performance → صاحب السيشن (teacher) بيشوف كورساته هو
//   بس. أدمن يقدر يمرر ?teacher=<id> عشان يشوف أداء مدرس معيّن (زي منطق
//   ?teacher= الموجود في GET /api/courses أصلاً).

import mongoose from "mongoose";
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

function average(nums) {
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export async function GET(request) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const { searchParams } = new URL(request.url);
    let teacherId = session.user.id;

    if (session.user.role === "admin") {
      const requested = searchParams.get("teacher");
      if (requested) {
        if (!mongoose.Types.ObjectId.isValid(requested)) return jsonResponse({ error: "invalid_teacher" }, 400);
        teacherId = requested;
      }
    } else if (session.user.role !== "teacher") {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    await connectToMongo();
    const Course = getCourseModel();
    const courses = await Course.find({ teacher: teacherId }, "title status studentsCount").sort({ createdAt: -1 }).lean();

    if (courses.length === 0) return jsonResponse({ courses: [] });

    const courseIds = courses.map((c) => c._id);

    const Enrollment = getEnrollmentModel();
    const Quiz = getQuizModel();
    const QuizResult = getQuizResultModel();
    const Assignment = getAssignmentModel();
    const Submission = getSubmissionModel();

    const [enrollments, quizzes, assignments] = await Promise.all([
      Enrollment.find({ course: { $in: courseIds } }, "course status").lean(),
      Quiz.find({ course: { $in: courseIds }, isPublished: true }, "course").lean(),
      Assignment.find({ course: { $in: courseIds }, isPublished: true }, "course maxScore").lean(),
    ]);

    const quizIds = quizzes.map((q) => q._id);
    const assignmentIds = assignments.map((a) => a._id);

    const [quizResults, submissions] = await Promise.all([
      quizIds.length > 0 ? QuizResult.find({ quiz: { $in: quizIds } }, "course quiz student scorePercent").lean() : [],
      assignmentIds.length > 0
        ? Submission.find({ assignment: { $in: assignmentIds }, status: "graded" }, "assignment score").lean()
        : [],
    ]);

    // أفضل نتيجة لكل (طالب، كويز) — نفس منطق /api/courses/[id]/performance،
    // عشان محاولات متكررة لنفس الكويز متأثّرش على المتوسط بالسلب.
    const bestQuizResult = new Map();
    for (const r of quizResults) {
      const key = `${r.student.toString()}:${r.quiz.toString()}`;
      const existing = bestQuizResult.get(key);
      if (!existing || r.scorePercent > existing.scorePercent) bestQuizResult.set(key, r);
    }

    const assignmentById = Object.fromEntries(assignments.map((a) => [a._id.toString(), a]));

    const enrollmentsByCourse = new Map();
    for (const e of enrollments) {
      const key = e.course.toString();
      if (!enrollmentsByCourse.has(key)) enrollmentsByCourse.set(key, []);
      enrollmentsByCourse.get(key).push(e);
    }

    const quizScoresByCourse = new Map();
    for (const r of bestQuizResult.values()) {
      const key = r.course.toString();
      if (!quizScoresByCourse.has(key)) quizScoresByCourse.set(key, []);
      quizScoresByCourse.get(key).push(r.scorePercent);
    }

    const assignmentScoresByCourse = new Map();
    for (const s of submissions) {
      const assignment = assignmentById[s.assignment.toString()];
      if (!assignment || !assignment.maxScore) continue;
      const key = assignment.course.toString();
      if (!assignmentScoresByCourse.has(key)) assignmentScoresByCourse.set(key, []);
      assignmentScoresByCourse.get(key).push((s.score / assignment.maxScore) * 100);
    }

    const rows = courses.map((c) => {
      const key = c._id.toString();
      const courseEnrollments = enrollmentsByCourse.get(key) || [];
      const completedCount = courseEnrollments.filter((e) => e.status === "completed").length;
      const completionRate =
        courseEnrollments.length > 0 ? Math.round((completedCount / courseEnrollments.length) * 100) : 0;

      const avgQuizScore = average(quizScoresByCourse.get(key) || []);
      const avgAssignmentScore = average(assignmentScoresByCourse.get(key) || []);
      const combined = [avgQuizScore, avgAssignmentScore].filter((v) => v !== null);
      const avgGrade = combined.length > 0 ? Math.round(combined.reduce((a, b) => a + b, 0) / combined.length) : null;

      return {
        courseId: key,
        courseTitle: c.title,
        status: c.status,
        studentsCount: courseEnrollments.length,
        completedCount,
        completionRate,
        avgQuizScore,
        avgAssignmentScore,
        avgGrade,
      };
    });

    return jsonResponse({ courses: rows });
  } catch (err) {
    console.error("[/api/teacher/performance] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
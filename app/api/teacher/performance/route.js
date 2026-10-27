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
//
// قواعد الحساب (نفس قواعد /api/courses/[id]/performance — progressMath.js —
// عشان الرقم يطلع واحد في الشاشتين):
//   - الطلاب = التسجيلات غير الملغية بس (cancelled مش بتتعدّ ولا بتدخل في المتوسطات).
//   - "مكتمل" بيتحسب حيًّا من الدروس/الكويزات الحالية، مش من enrollment.status المخزّنة.
//   - متوسط الكويزات: أفضل نتيجة *متصححة* لكل (طالب، كويز) — المحاولات المعلّقة
//     (pending_review) درجتها مؤقتة فبتتجاهل.
//   - متوسط الواجبات: التسليمات المتصححة لطلاب الكورس الحاليين، بدرجة صالحة بس.

import mongoose from "mongoose";
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

function average(nums) {
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function pushTo(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

export async function GET(request) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const { searchParams } = new URL(request.url);
    let teacherId = session.user.id;
    // 🆕 الموديريتور بيشوف أداء كورسات كل المدرّسين افتراضيًا (من غير فلتر
    // teacher)، ولو بعت ?teacher=<id> بيتفلتر على مدرّس معيّن.
    let allTeachers = false;

    if (session.user.role === "admin" || session.user.role === "moderator") {
      const requested = searchParams.get("teacher");
      if (requested) {
        if (!mongoose.Types.ObjectId.isValid(requested)) return jsonResponse({ error: "invalid_teacher" }, 400);
        teacherId = requested;
      } else if (session.user.role === "moderator") {
        allTeachers = true;
      }
    } else if (session.user.role !== "teacher") {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    await connectToMongo();
    const Course = getCourseModel();
    const courses = await Course.find(allTeachers ? {} : { teacher: teacherId }, "title status studentsCount")
      .sort({ createdAt: -1 })
      .lean();

    if (courses.length === 0) return jsonResponse({ courses: [] });

    const courseIds = courses.map((c) => c._id);

    const Enrollment = getEnrollmentModel();
    const Lesson = getLessonModel();
    const Quiz = getQuizModel();
    const QuizResult = getQuizResultModel();
    const Assignment = getAssignmentModel();
    const Submission = getSubmissionModel();

    const [enrollments, nonQuizLessons, quizzes, assignments] = await Promise.all([
      // 🔒 الملغي (cancelled) ملوش وصول للكورس → برّه كل الإحصائيات
      Enrollment.find({ course: { $in: courseIds }, status: { $ne: "cancelled" } }, "course user completedLessons").lean(),
      Lesson.find({ course: { $in: courseIds }, type: { $ne: "quiz" } }, "course").lean(),
      Quiz.find({ course: { $in: courseIds }, isPublished: true }, "course").lean(),
      Assignment.find({ course: { $in: courseIds }, isPublished: true }, "course maxScore").lean(),
    ]);

    const quizIds = quizzes.map((q) => q._id);
    const assignmentIds = assignments.map((a) => a._id);

    const [quizResults, submissions] = await Promise.all([
      quizIds.length > 0
        ? QuizResult.find({ quiz: { $in: quizIds } }, "quiz student scorePercent passed status").lean()
        : [],
      assignmentIds.length > 0
        ? Submission.find({ assignment: { $in: assignmentIds }, status: "graded" }, "assignment student score").lean()
        : [],
    ]);

    const courseOfQuiz = new Map(quizzes.map((q) => [q._id.toString(), q.course.toString()]));
    const assignmentById = Object.fromEntries(assignments.map((a) => [a._id.toString(), a]));

    const lessonIdsByCourse = new Map();
    for (const l of nonQuizLessons) pushTo(lessonIdsByCourse, l.course.toString(), l._id);
    const quizIdsByCourse = new Map();
    for (const q of quizzes) pushTo(quizIdsByCourse, q.course.toString(), q._id);

    const enrollmentsByCourse = new Map();
    const enrolledKeys = new Set(); // `${courseId}:${studentId}`
    for (const e of enrollments) {
      pushTo(enrollmentsByCourse, e.course.toString(), e);
      enrolledKeys.add(`${e.course.toString()}:${e.user.toString()}`);
    }

    // محاولات كل (كورس، طالب، كويز) — لطلاب الكورس الحاليين بس
    const attemptsByKey = new Map(); // `${courseId}:${studentId}:${quizId}` → result[]
    const passedQuizIdsByCourseStudent = new Map(); // `${courseId}:${studentId}` → quizId[]
    for (const r of quizResults) {
      const courseId = courseOfQuiz.get(r.quiz.toString());
      if (!courseId) continue;
      const studentId = r.student.toString();
      if (!enrolledKeys.has(`${courseId}:${studentId}`)) continue;

      pushTo(attemptsByKey, `${courseId}:${studentId}:${r.quiz.toString()}`, r);
      if (r.passed) pushTo(passedQuizIdsByCourseStudent, `${courseId}:${studentId}`, r.quiz);
    }

    // أفضل نتيجة متصححة لكل (طالب، كويز) — محاولات متكررة متأثّرش على المتوسط
    // بالسلب، والمعلّقة متدخلش المتوسط بدرجة مؤقتة.
    const quizScoresByCourse = new Map();
    for (const [key, attempts] of attemptsByKey) {
      const { best } = pickBestQuizResult(attempts);
      if (!best) continue;
      pushTo(quizScoresByCourse, key.split(":")[0], best.scorePercent);
    }

    const assignmentScoresByCourse = new Map();
    for (const s of submissions) {
      const assignment = assignmentById[s.assignment.toString()];
      if (!assignment || !assignment.maxScore) continue;
      const courseId = assignment.course.toString();
      if (!enrolledKeys.has(`${courseId}:${s.student.toString()}`)) continue;
      if (typeof s.score !== "number" || !Number.isFinite(s.score)) continue;
      pushTo(assignmentScoresByCourse, courseId, (s.score / assignment.maxScore) * 100);
    }

    const rows = courses.map((c) => {
      const key = c._id.toString();
      const courseEnrollments = enrollmentsByCourse.get(key) || [];

      const completedCount = courseEnrollments.filter((e) => {
        return computeProgress({
          nonQuizLessonIds: lessonIdsByCourse.get(key) || [],
          publishedQuizIds: quizIdsByCourse.get(key) || [],
          completedLessonIds: e.completedLessons || [],
          passedQuizIds: passedQuizIdsByCourseStudent.get(`${key}:${e.user.toString()}`) || [],
        }).isComplete;
      }).length;
      // 🔒 نفس قاعدة التقريب: 100% بس لو كل الطلاب خلّصوا فعلاً (199/200 → 99%)
      let completionRate =
        courseEnrollments.length > 0 ? Math.round((completedCount / courseEnrollments.length) * 100) : 0;
      if (completedCount < courseEnrollments.length && completionRate >= 100) completionRate = 99;

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

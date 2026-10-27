// app/api/quizzes/[id]/results/route.js
//
// Phase 4 — اليوم 41: "صفحة نتائجي للطالب + صفحة أداء الطلاب للمدرس" —
// الجزء الخاص بنتائج كويز معيّن للمدرس. بيرجّع لكل طالب حل الكويز: عدد
// محاولاته، أفضل نتيجة، آخر نتيجة، وهل نجح (بأفضل محاولة).
//
// GET /api/quizzes/[id]/results → صاحب الكورس أو أدمن بس.

import mongoose from "mongoose";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { getCourseModel, getQuizModel, getQuizResultModel } from "@/app/lib/models";
import { requireSession, isOwnerOrStaff } from "@/app/lib/rbac";
import { pickBestQuizResult, isPendingReview } from "@/app/lib/progressMath";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_quiz" }, 400);

    await connectToMongo();
    const Quiz = getQuizModel();
    const quiz = await Quiz.findById(id).lean();
    if (!quiz) return jsonResponse({ error: "not_found" }, 404);

    const Course = getCourseModel();
    const course = await Course.findById(quiz.course).lean();
    if (!course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!isOwnerOrStaff(auth.session, course.teacher)) return jsonResponse({ error: "forbidden" }, 403);

    const QuizResult = getQuizResultModel();
    const results = await QuizResult.find({ quiz: quiz._id }).sort({ submittedAt: 1 }).lean();

    const byStudent = new Map();
    for (const r of results) {
      const key = r.student.toString();
      if (!byStudent.has(key)) byStudent.set(key, []);
      byStudent.get(key).push(r);
    }

    const AuthModel = getAuthModel();
    const students = await AuthModel.find(
      { _id: { $in: [...byStudent.keys()] } },
      "name email"
    ).lean();
    const studentById = Object.fromEntries(students.map((s) => [s._id.toString(), s]));

    const rows = [...byStudent.entries()].map(([studentId, attempts]) => {
      const sorted = attempts.slice().sort((a, b) => a.attemptNumber - b.attemptNumber);
      const latest = sorted[sorted.length - 1];
      // 🔒 المحاولة المعلّقة (pending_review) درجتها مؤقتة (الاختياري بس) و passed=false
      // لحد ما المقالي يتصحح → مبتدخلش في "أفضل نتيجة". لو دي المحاولة الوحيدة،
      // best=null والصفحة بتعرض "بانتظار التصحيح".
      const { best } = pickBestQuizResult(sorted);
      const latestIsPending = isPendingReview(latest);
      return {
        studentId,
        studentName: studentById[studentId]?.name || "—",
        studentEmail: studentById[studentId]?.email || "—",
        attemptsCount: sorted.length,
        bestScorePercent: best ? best.scorePercent : null,
        bestPassed: best ? Boolean(best.passed) : null,
        latestScorePercent: latestIsPending ? null : latest.scorePercent,
        latestPassed: latestIsPending ? null : latest.passed,
        // 🆕 كل محاولات الطالب (عشان المدرّس/الموديريتر يفتح المقالي ويصحّحه أو يبعت رسالة)
        pendingReviewCount: sorted.filter((r) => r.status === "pending_review").length,
        attempts: sorted.map((r) => ({
          id: r._id.toString(),
          attemptNumber: r.attemptNumber,
          scorePercent: r.scorePercent,
          passed: r.passed,
          status: r.status || "graded",
          submittedAt: r.submittedAt,
          messagesCount: (r.messages || []).length,
        })),
      };
    });

    rows.sort((a, b) => a.studentName.localeCompare(b.studentName, "ar"));

    return jsonResponse({
      quizTitle: quiz.title,
      courseTitle: course.title,
      totalStudents: rows.length,
      passedCount: rows.filter((r) => r.bestPassed === true).length,
      pendingReviewCount: rows.reduce((n, r) => n + r.pendingReviewCount, 0),
      results: rows,
    });
  } catch (err) {
    console.error("[/api/quizzes/[id]/results] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
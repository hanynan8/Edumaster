// app/api/quizzes/[id]/results/[resultId]/route.js
//
// 🆕 محاولة واحدة بالتفصيل (أسئلة + إجابات الطالب + المقالي + المحادثة) وتصحيح المقالي يدويًا.
//
// GET /api/quizzes/[id]/results/[resultId]
//   → صاحب الكورس / موديريتر / أدمن، أو الطالب صاحب المحاولة نفسه.
//
// PUT /api/quizzes/[id]/results/[resultId] { grades: [{ question, points, feedback? }] }
//   → صاحب الكورس / موديريتر / أدمن بس. بيحط درجة (0..q.points) لكل سؤال مقالي،
//   وبيعيد حساب النتيجة والنجاح، ولما كل المقالي يتصحح المحاولة بتبقى graded.

import mongoose from "mongoose";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import {
  getCourseModel,
  getQuizModel,
  getQuestionModel,
  getQuizResultModel,
  getEnrollmentModel,
} from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";
import { threadAccess, serializeMessages } from "@/app/lib/threadMessages";
import { serializeQuestion } from "@/app/lib/quizQuestionHelpers";
import { recomputeEnrollmentProgress } from "@/app/lib/progressHelpers";
import { createNotification } from "@/app/lib/notificationHelpers";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function load(quizId, resultId) {
  if (!mongoose.Types.ObjectId.isValid(quizId) || !mongoose.Types.ObjectId.isValid(resultId)) return {};
  const quiz = await getQuizModel().findById(quizId).lean();
  if (!quiz) return {};
  const course = await getCourseModel().findById(quiz.course).lean();
  const result = await getQuizResultModel().findOne({ _id: resultId, quiz: quiz._id });
  return { quiz, course, result };
}

async function senderNames(ids) {
  const users = await getAuthModel().find({ _id: { $in: [...new Set(ids.map(String))] } }, "name").lean();
  return Object.fromEntries(users.map((u) => [u._id.toString(), u.name]));
}

async function serializeResult(result, quiz, access) {
  const questions = await getQuestionModel().find({ quiz: quiz._id }).sort({ order: 1, createdAt: 1 }).lean();
  const answerByQ = new Map(result.answers.map((a) => [String(a.question), a]));
  const names = await senderNames([result.student, ...result.messages.map((m) => m.sender)]);

  return {
    id: result._id.toString(),
    quizId: quiz._id.toString(),
    quizTitle: quiz.title,
    studentId: result.student.toString(),
    studentName: names[result.student.toString()] || "—",
    attemptNumber: result.attemptNumber,
    status: result.status || "graded",
    totalPoints: result.totalPoints,
    earnedPoints: result.earnedPoints,
    scorePercent: result.scorePercent,
    passed: result.passed,
    passingScorePercent: quiz.passingScorePercent,
    submittedAt: result.submittedAt,
    gradedAt: result.gradedAt,
    canGrade: access === "staff",
    questions: questions.map((q) => {
      const a = answerByQ.get(String(q._id));
      return {
        // 🔒 الطالب مبيشوفش أي خيار هو الصح (بس هل اختياره صح) عشان المحاولات الجاية
        ...serializeQuestion(q, { forStudent: access === "student" }),
        answer: a
          ? {
              selectedOptionIndex: a.selectedOptionIndex ?? null,
              isCorrect: a.isCorrect,
              pointsEarned: a.pointsEarned,
              textAnswer: a.textAnswer ?? null,
              needsManualGrading: Boolean(a.needsManualGrading),
              manuallyGraded: Boolean(a.manuallyGraded),
              feedback: a.feedback ?? null,
            }
          : null,
      };
    }),
    messages: serializeMessages(result.messages, names),
  };
}

export async function GET(request, { params }) {
  try {
    const { id, resultId } = await params;
    await connectToMongo();
    const { quiz, course, result } = await load(id, resultId);
    if (!quiz || !course || !result) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const access = threadAccess(auth.session, course.teacher, result.student);
    if (!access) return jsonResponse({ error: "forbidden" }, 403);

    return jsonResponse(await serializeResult(result, quiz, access));
  } catch (err) {
    console.error("[/api/quizzes/[id]/results/[resultId]] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id, resultId } = await params;
    await connectToMongo();
    const { quiz, course, result } = await load(id, resultId);
    if (!quiz || !course || !result) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;
    if (threadAccess(session, course.teacher, result.student) !== "staff") {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const body = await request.json().catch(() => null);
    const grades = Array.isArray(body?.grades) ? body.grades : [];
    if (grades.length === 0) return jsonResponse({ error: "no_grades" }, 400);

    const questions = await getQuestionModel().find({ quiz: quiz._id }).lean();
    const questionById = new Map(questions.map((q) => [String(q._id), q]));

    // 🔒 بنعدّل بس إجابات الأسئلة المقالية، والدرجة بين 0 وقيمة السؤال
    for (const g of grades) {
      const q = questionById.get(String(g?.question));
      const answer = result.answers.find((a) => String(a.question) === String(g?.question));
      if (!q || !answer || q.type !== "essay") return jsonResponse({ error: "invalid_question" }, 400);
      const points = Number(g.points);
      if (!Number.isFinite(points) || points < 0 || points > q.points) {
        return jsonResponse({ error: "invalid_points", question: String(q._id), max: q.points }, 400);
      }
      answer.pointsEarned = points;
      answer.manuallyGraded = true;
      answer.needsManualGrading = false;
      if (g.feedback !== undefined) answer.feedback = String(g.feedback || "").slice(0, 5000) || null;
    }

    const earnedPoints = result.answers.reduce((sum, a) => sum + (a.pointsEarned || 0), 0);
    const stillPending = result.answers.some((a) => a.needsManualGrading);
    const scorePercent =
      result.totalPoints > 0 ? Math.min(100, Math.round((earnedPoints / result.totalPoints) * 100)) : 0;

    result.earnedPoints = earnedPoints;
    result.scorePercent = scorePercent;
    result.status = stillPending ? "pending_review" : "graded";
    result.passed = !stillPending && scorePercent >= quiz.passingScorePercent;
    result.gradedBy = session.user.id;
    result.gradedAt = new Date();
    result.markModified("answers");
    await result.save();

    if (!stillPending) {
      // نفس اللي attempt بيعمله لما الكويز كله تصحيح تلقائي: اكتمال الدرس + التقدّم
      if (quiz.lesson && result.passed) {
        await getEnrollmentModel().updateOne(
          { user: result.student, course: course._id },
          { $addToSet: { completedLessons: quiz.lesson } }
        );
      }
      await recomputeEnrollmentProgress(result.student, course._id);
      await createNotification({
        user: result.student,
        type: "quiz_result",
        key: "essay_graded",
        params: { quizTitle: quiz.title, scorePercent, passed: result.passed },
        link: `/student/quizzes/${quiz._id}`,
        course: course._id,
      });
    }

    return jsonResponse(await serializeResult(result, quiz, "staff"));
  } catch (err) {
    console.error("[/api/quizzes/[id]/results/[resultId]] PUT error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

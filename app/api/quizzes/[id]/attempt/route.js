// app/api/quizzes/[id]/attempt/route.js
//
// Phase 4 — اليوم 35-36: "Student: حل الـ Quiz + تصحيح تلقائي فوري + تسجيل
// النتيجة (quizResults)".
//
// POST /api/quizzes/[id]/attempt { answers: [{ question, selectedOptionIndex }] }
//   🔒 التصحيح كله سيرفر-سايد: بنجيب الأسئلة من الداتابيز (بـ isCorrect)
//   ونقارنها بـ selectedOptionIndex اللي بعته الطالب — الطالب مبيبعتش أي
//   isCorrect ولا نتيجة جاهزة، فمستحيل يغش بتعديل الـ request. لو درس
//   الكويز موجود (lesson.type === "quiz") وبيربط بيه، بيتحط تلقائي في
//   completedLessons لما الطالب ينجح، عشان الـ progress (اليوم 42) يتحدث
//   صح من غير خطوة إضافية.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getQuizModel, getQuestionModel, getQuizResultModel, getEnrollmentModel } from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";
import { getCourseAccessForUser } from "@/app/lib/access";
import { recomputeEnrollmentProgress } from "@/app/lib/progressHelpers";
import { createNotification } from "@/app/lib/notificationHelpers";
import { enforceRateLimit } from "@/app/lib/rateLimit";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_quiz" }, 400);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    // 🔒 SECURITY (Day 59): طبقة حماية إضافية جنب حد maxAttempts — بتمنع
    // أي محاولة تلقائية تضرب الـ endpoint بسرعة (مثلاً سكربت بيجرب يلاقي
    // race condition حوالين الـ unique index).
    const rl = await enforceRateLimit(request, {
      keyPrefix: "quiz:attempt",
      limit: 10,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    await connectToMongo();
    const Quiz = getQuizModel();
    const quiz = await Quiz.findById(id).lean();
    if (!quiz || !quiz.isPublished) return jsonResponse({ error: "not_found" }, 404);

    const Course = getCourseModel();
    const course = await Course.findById(quiz.course).lean();
    if (!course) return jsonResponse({ error: "not_found" }, 404);

    // 🔒 لازم وصول فعلي للكورس (enrollment/membership) قبل ما يحل أي كويز
    const access = await getCourseAccessForUser({ userId: session.user.id, courseId: course._id });
    if (!access.hasAccess) return jsonResponse({ error: "forbidden" }, 403);

    const QuizResult = getQuizResultModel();
    const attemptsUsed = await QuizResult.countDocuments({ quiz: quiz._id, student: session.user.id });
    if (attemptsUsed >= quiz.maxAttempts) {
      return jsonResponse({ error: "max_attempts_reached" }, 400);
    }

    const body = await request.json().catch(() => null);
    const submittedAnswers = Array.isArray(body?.answers) ? body.answers : [];

    const Question = getQuestionModel();
    const questions = await Question.find({ quiz: quiz._id }).lean();
    if (questions.length === 0) return jsonResponse({ error: "quiz_has_no_questions" }, 400);

    // فهرسة إجابات الطالب حسب question id عشان lookup سريع، وسؤال متسيّب
    // فاضي (مش موجود في answers) بيتحسب selectedOptionIndex=null (غلط)
    const answerByQuestion = new Map(
      submittedAnswers
        .filter((a) => a && a.question)
        .map((a) => [String(a.question), a.selectedOptionIndex])
    );

    let totalPoints = 0;
    let earnedPoints = 0;
    const gradedAnswers = questions.map((q) => {
      totalPoints += q.points;
      const rawSelected = answerByQuestion.get(String(q._id));
      const selectedOptionIndex =
        Number.isInteger(rawSelected) && rawSelected >= 0 && rawSelected < q.options.length ? rawSelected : null;

      const isCorrect = selectedOptionIndex !== null && Boolean(q.options[selectedOptionIndex]?.isCorrect);
      const pointsEarned = isCorrect ? q.points : 0;
      earnedPoints += pointsEarned;

      return {
        question: q._id,
        selectedOptionIndex,
        isCorrect,
        pointsEarned,
      };
    });

    const scorePercent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = scorePercent >= quiz.passingScorePercent;

    const result = await QuizResult.create({
      quiz: quiz._id,
      student: session.user.id,
      course: course._id,
      answers: gradedAnswers,
      totalPoints,
      earnedPoints,
      scorePercent,
      passed,
      attemptNumber: attemptsUsed + 1,
    });

    // لو الكويز مرتبط بدرس (lesson.type === "quiz")، بنعتبره "مكتمل"
    // ضمن completedLessons برضه عشان أي واجهة بتعرض دروس مكتملة تتظبط،
    // حتى لو مش لازم عشان نسبة التقدّم (اللي بتحسب نجاح الكويز مباشرة).
    if (quiz.lesson) {
      const Enrollment = getEnrollmentModel();
      await Enrollment.updateOne(
        { user: session.user.id, course: course._id },
        { $addToSet: { completedLessons: quiz.lesson }, $set: { lastAccessedLesson: quiz.lesson } }
      );
    }

    const enrollment = await recomputeEnrollmentProgress(session.user.id, course._id);

    // 🔔 Phase 6 — اليوم 50-51: إشعار "نتيجة كويز" للطالب نفسه (best-effort،
    // مش لازم ينجح عشان النتيجة تترجع في الـ response أصلًا).
    await createNotification({
      user: session.user.id,
      type: "quiz_result",
      title: quiz.title,
      message: passed
        ? `${scorePercent}% — Passed`
        : `${scorePercent}% — Not passed yet`,
      link: `/student/grades`,
      course: course._id,
    });

    return jsonResponse(
      {
        id: result._id.toString(),
        totalPoints,
        earnedPoints,
        scorePercent,
        passed,
        attemptNumber: result.attemptNumber,
        attemptsRemaining: Math.max(0, quiz.maxAttempts - (attemptsUsed + 1)),
        // 🔒 كشف isCorrect لكل سؤال هنا مقبول (بعكس GET /api/quizzes/[id]
        // للطالب) لأن ده *بعد* التسليم — مراجعة إجاباته وقتها مش غش.
        answers: gradedAnswers.map((a) => ({
          question: a.question.toString(),
          selectedOptionIndex: a.selectedOptionIndex,
          isCorrect: a.isCorrect,
          pointsEarned: a.pointsEarned,
        })),
        courseProgressPercent: enrollment?.progressPercent ?? null,
      },
      201
    );
  } catch (err) {
    // 🔒 لو حصل race condition (ضغط "تسليم" مرتين بسرعة) الـ unique index
    // على (quiz, student, attemptNumber) هيرفض المحاولة المكررة بدل ما
    // يتسجل سجل مكرر
    if (err?.code === 11000) {
      return jsonResponse({ error: "duplicate_attempt" }, 409);
    }
    console.error("[/api/quizzes/[id]/attempt] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
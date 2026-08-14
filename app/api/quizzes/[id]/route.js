// app/api/quizzes/[id]/route.js
//
// Phase 4 — اليوم 33-34/35-36.
//
// GET /api/quizzes/[id] → بيرجّع الكويز مع أسئلته.
//   - المدرس صاحب الكورس (أو أدمن): كل الأسئلة كاملة مع isCorrect لكل
//     خيار (عشان يقدر يدير الأسئلة من app/teacher/quizzes/[quizId]).
//   - الطالب: 🔒 الأسئلة من غير isCorrect خالص (السيرفر بس هو اللي بيصحح
//     وقت POST attempt) + attemptsUsed/attemptsRemaining/canAttempt + آخر
//     نتيجة لو حلّه قبل كده. لازم يكون عنده enrollment/membership فعلية
//     على الكورس، والكويز لازم يكون منشور.
//
// PUT/DELETE: صاحب الكورس أو أدمن بس.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getQuizModel, getQuestionModel, getQuizResultModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";
import { getCourseAccessForUser } from "@/app/lib/access";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function serializeQuizMeta(q) {
  return {
    id: q._id.toString(),
    course: q.course?.toString?.() ?? q.course,
    lesson: q.lesson ? q.lesson.toString() : null,
    section: q.section ? q.section.toString() : null,
    title: q.title,
    description: q.description,
    timeLimitMinutes: q.timeLimitMinutes,
    passingScorePercent: q.passingScorePercent,
    maxAttempts: q.maxAttempts,
    isPublished: q.isPublished,
  };
}

function serializeQuestionForTeacher(qq) {
  return {
    id: qq._id.toString(),
    type: qq.type,
    text: qq.text,
    points: qq.points,
    order: qq.order,
    options: (qq.options || []).map((o, index) => ({ index, text: o.text, isCorrect: o.isCorrect })),
  };
}

function serializeQuestionForStudent(qq) {
  return {
    id: qq._id.toString(),
    type: qq.type,
    text: qq.text,
    points: qq.points,
    order: qq.order,
    // 🔒 مفيش isCorrect هنا خالص — التصحيح بيحصل سيرفر-سايد بس وقت attempt
    options: (qq.options || []).map((o, index) => ({ index, text: o.text })),
  };
}

async function loadQuizWithCourse(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return { quiz: null, course: null };
  const Quiz = getQuizModel();
  const Course = getCourseModel();
  const quiz = await Quiz.findById(id);
  if (!quiz) return { quiz: null, course: null };
  const course = await Course.findById(quiz.course);
  return { quiz, course };
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await connectToMongo();
    const { quiz, course } = await loadQuizWithCourse(id);
    if (!quiz || !course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const canManage = isOwnerOrAdmin(session, course.teacher);
    const Question = getQuestionModel();
    const questions = await Question.find({ quiz: quiz._id }).sort({ order: 1, createdAt: 1 }).lean();

    if (canManage) {
      return jsonResponse({
        ...serializeQuizMeta(quiz),
        questions: questions.map(serializeQuestionForTeacher),
      });
    }

    // طالب: لازم يكون عنده وصول للكورس والكويز يكون منشور
    if (!quiz.isPublished) return jsonResponse({ error: "not_found" }, 404);
    const access = await getCourseAccessForUser({ userId: session.user.id, courseId: course._id });
    if (!access.hasAccess) return jsonResponse({ error: "forbidden" }, 403);

    const QuizResult = getQuizResultModel();
    const previousResults = await QuizResult.find({ quiz: quiz._id, student: session.user.id })
      .sort({ attemptNumber: -1 })
      .lean();
    const attemptsUsed = previousResults.length;
    const bestResult = previousResults.reduce(
      (best, r) => (!best || r.scorePercent > best.scorePercent ? r : best),
      null
    );

    return jsonResponse({
      ...serializeQuizMeta(quiz),
      questions: questions.map(serializeQuestionForStudent),
      attemptsUsed,
      attemptsRemaining: Math.max(0, quiz.maxAttempts - attemptsUsed),
      canAttempt: attemptsUsed < quiz.maxAttempts && questions.length > 0,
      lastResult: previousResults[0]
        ? { scorePercent: previousResults[0].scorePercent, passed: previousResults[0].passed, attemptNumber: previousResults[0].attemptNumber }
        : null,
      bestResult: bestResult ? { scorePercent: bestResult.scorePercent, passed: bestResult.passed } : null,
    });
  } catch (err) {
    console.error("[/api/quizzes/[id]] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    await connectToMongo();
    const { quiz, course } = await loadQuizWithCourse(id);
    if (!quiz || !course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!isOwnerOrAdmin(auth.session, course.teacher)) return jsonResponse({ error: "forbidden" }, 403);

    const body = await request.json().catch(() => null);
    if (body?.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return jsonResponse({ error: "missing_title" }, 400);
      quiz.title = title;
    }
    if (body?.description !== undefined) quiz.description = String(body.description);
    if (body?.timeLimitMinutes !== undefined) {
      quiz.timeLimitMinutes =
        body.timeLimitMinutes === null || body.timeLimitMinutes === "" ? null : Math.max(1, Number(body.timeLimitMinutes) || 1);
    }
    if (body?.passingScorePercent !== undefined) {
      quiz.passingScorePercent = Math.min(100, Math.max(0, Number(body.passingScorePercent) || 0));
    }
    if (body?.maxAttempts !== undefined) {
      quiz.maxAttempts = Math.max(1, Number(body.maxAttempts) || 1);
    }
    if (body?.isPublished !== undefined) quiz.isPublished = Boolean(body.isPublished);
    if (body?.lesson !== undefined) {
      quiz.lesson = body.lesson && mongoose.Types.ObjectId.isValid(body.lesson) ? body.lesson : null;
    }
    if (body?.section !== undefined) {
      quiz.section = body.section && mongoose.Types.ObjectId.isValid(body.section) ? body.section : null;
    }

    await quiz.save();
    return jsonResponse(serializeQuizMeta(quiz));
  } catch (err) {
    console.error("[/api/quizzes/[id]] PUT error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await connectToMongo();
    const { quiz, course } = await loadQuizWithCourse(id);
    if (!quiz || !course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!isOwnerOrAdmin(auth.session, course.teacher)) return jsonResponse({ error: "forbidden" }, 403);

    const Question = getQuestionModel();
    const QuizResult = getQuizResultModel();
    // 🔒 الحذف بيشيل معاه الأسئلة ونتائج الطلاب المرتبطة — منعًا لسجلات
    // "يتيمة" بتشاور على quiz متمسوح.
    await Promise.all([
      Question.deleteMany({ quiz: quiz._id }),
      QuizResult.deleteMany({ quiz: quiz._id }),
      quiz.deleteOne(),
    ]);

    return jsonResponse({ deleted: true });
  } catch (err) {
    console.error("[/api/quizzes/[id]] DELETE error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
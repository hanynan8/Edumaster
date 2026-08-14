// app/api/quizzes/[id]/questions/[questionId]/route.js
//
// Phase 4 — اليوم 33-34: تعديل/حذف سؤال معيّن جوه كويز. صاحب الكورس أو
// أدمن بس.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getQuizModel, getQuestionModel } from "@/app/lib/models";
import { requireSession, isOwnerOrAdmin } from "@/app/lib/rbac";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const ALLOWED_TYPES = ["multiple_choice", "true_false"];

function serializeQuestion(qq) {
  return {
    id: qq._id.toString(),
    type: qq.type,
    text: qq.text,
    points: qq.points,
    order: qq.order,
    options: (qq.options || []).map((o, index) => ({ index, text: o.text, isCorrect: o.isCorrect })),
  };
}

function validateOptions(type, options) {
  if (!Array.isArray(options) || options.length < 2) return "options_required";
  if (type === "true_false" && options.length !== 2) return "true_false_needs_two_options";
  if (options.some((o) => !String(o?.text || "").trim())) return "empty_option_text";
  if (!options.some((o) => Boolean(o?.isCorrect))) return "no_correct_option";
  if (type === "true_false" && options.filter((o) => o.isCorrect).length !== 1) {
    return "true_false_needs_one_correct";
  }
  return null;
}

async function loadQuestionWithCourse(quizId, questionId) {
  if (!mongoose.Types.ObjectId.isValid(quizId) || !mongoose.Types.ObjectId.isValid(questionId)) {
    return { question: null, course: null };
  }
  const Question = getQuestionModel();
  const Quiz = getQuizModel();
  const Course = getCourseModel();

  const question = await Question.findOne({ _id: questionId, quiz: quizId });
  if (!question) return { question: null, course: null };
  const quiz = await Quiz.findById(quizId).lean();
  if (!quiz) return { question: null, course: null };
  const course = await Course.findById(quiz.course);
  return { question, course };
}

export async function PUT(request, { params }) {
  try {
    const { id, questionId } = await params;
    await connectToMongo();
    const { question, course } = await loadQuestionWithCourse(id, questionId);
    if (!question || !course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!isOwnerOrAdmin(auth.session, course.teacher)) return jsonResponse({ error: "forbidden" }, 403);

    const body = await request.json().catch(() => null);

    const type = body?.type !== undefined ? body.type : question.type;
    if (!ALLOWED_TYPES.includes(type)) return jsonResponse({ error: "invalid_type", allowed: ALLOWED_TYPES }, 400);

    if (body?.text !== undefined) {
      const text = String(body.text).trim();
      if (!text) return jsonResponse({ error: "missing_text" }, 400);
      question.text = text;
    }

    if (body?.options !== undefined) {
      const options = (Array.isArray(body.options) ? body.options : []).map((o) => ({
        text: String(o?.text || "").trim(),
        isCorrect: Boolean(o?.isCorrect),
      }));
      const optionsError = validateOptions(type, options);
      if (optionsError) return jsonResponse({ error: optionsError }, 400);
      question.options = options;
    }

    question.type = type;
    if (body?.points !== undefined) question.points = Math.max(0, Number(body.points) || 0);
    if (body?.order !== undefined) question.order = Number(body.order) || 0;

    await question.save();
    return jsonResponse(serializeQuestion(question));
  } catch (err) {
    console.error("[/api/quizzes/[id]/questions/[questionId]] PUT error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id, questionId } = await params;
    await connectToMongo();
    const { question, course } = await loadQuestionWithCourse(id, questionId);
    if (!question || !course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!isOwnerOrAdmin(auth.session, course.teacher)) return jsonResponse({ error: "forbidden" }, 403);

    await question.deleteOne();
    return jsonResponse({ deleted: true });
  } catch (err) {
    console.error("[/api/quizzes/[id]/questions/[questionId]] DELETE error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
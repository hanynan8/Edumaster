// app/api/quizzes/[id]/questions/route.js
//
// Phase 4 — اليوم 33-34: إضافة سؤال (Multiple Choice / True-False) لكويز
// معيّن. صاحب الكورس أو أدمن بس.

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

// بيتحقق إن شكل options صالح: 2 خيار على الأقل، وخيار صح واحد على الأقل،
// ومفيش خيار نصه فاضي. لـ true_false بنفرض بالظبط خيارين ("صح"/"غلط").
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

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_quiz" }, 400);

    await connectToMongo();
    const Quiz = getQuizModel();
    const quiz = await Quiz.findById(id);
    if (!quiz) return jsonResponse({ error: "not_found" }, 404);

    const Course = getCourseModel();
    const course = await Course.findById(quiz.course);
    if (!course) return jsonResponse({ error: "not_found" }, 404);

    const auth = await requireSession();
    if (auth.response) return auth.response;
    if (!isOwnerOrAdmin(auth.session, course.teacher)) return jsonResponse({ error: "forbidden" }, 403);

    const body = await request.json().catch(() => null);
    const type = ALLOWED_TYPES.includes(body?.type) ? body.type : null;
    if (!type) return jsonResponse({ error: "invalid_type", allowed: ALLOWED_TYPES }, 400);

    const text = String(body?.text || "").trim();
    if (!text) return jsonResponse({ error: "missing_text" }, 400);

    const options = (Array.isArray(body?.options) ? body.options : []).map((o) => ({
      text: String(o?.text || "").trim(),
      isCorrect: Boolean(o?.isCorrect),
    }));
    const optionsError = validateOptions(type, options);
    if (optionsError) return jsonResponse({ error: optionsError }, 400);

    const Question = getQuestionModel();
    let order = Number.isFinite(Number(body?.order)) ? Number(body.order) : null;
    if (order === null) order = await Question.countDocuments({ quiz: quiz._id });

    const created = await Question.create({
      quiz: quiz._id,
      type,
      text,
      options,
      points: Number.isFinite(Number(body?.points)) ? Math.max(0, Number(body.points)) : 1,
      order,
    });

    return jsonResponse(serializeQuestion(created), 201);
  } catch (err) {
    console.error("[/api/quizzes/[id]/questions] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
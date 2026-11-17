// app/lib/assignmentQuestions.js
//
// 🆕 أسئلة تفاعلية داخل الواجب (اختيار من متعدد / صح وغلط) — إضافية جنب منطق
// الواجب الحالي (وصف + مرفق + تسليم ملف/نص). نفس فكرة الكويزات:
//   - المدرّس بيضيف الأسئلة يدوي أو باستيراد PDF (نفس صيغة بنك الأسئلة).
//   - الطالب بيبعت اختياراته بس، والتصحيح كله سيرفر-سايد فور الإرسال.
//   - 🔒 isCorrect ما بيتبعتش للطالب إلا بعد ما يسلّم (مراجعة إجاباته).
//
// بنعيد استخدام قواعد التحقق بتاعة الكويزات (quizQuestionHelpers) عشان السؤال
// يطلع بنفس القيود سواء اتضاف يدوي أو من PDF.

import mongoose from "mongoose";
import { validateOptionsLikeForm, normalizeOptions, normalizePoints } from "@/app/lib/quizQuestionHelpers";

export const ASSIGNMENT_QUESTION_TYPES = ["multiple_choice", "true_false"];
export const MAX_ASSIGNMENT_QUESTIONS = 100;

/**
 * تنضيف + تحقق من قايمة أسئلة جاية من الـ client.
 * @returns {{ ok: true, questions: object[] } | { ok: false, error: string, index?: number }}
 */
export function sanitizeAssignmentQuestions(raw) {
  if (raw === undefined || raw === null) return { ok: true, questions: [] };
  if (!Array.isArray(raw)) return { ok: false, error: "invalid_questions" };
  if (raw.length > MAX_ASSIGNMENT_QUESTIONS) return { ok: false, error: "too_many_questions" };

  const questions = [];
  for (let index = 0; index < raw.length; index++) {
    const q = raw[index];
    const type = ASSIGNMENT_QUESTION_TYPES.includes(q?.type) ? q.type : null;
    if (!type) return { ok: false, error: "invalid_type", index };

    const text = String(q?.text || "").trim();
    if (!text) return { ok: false, error: "missing_text", index };

    const options = normalizeOptions(q?.options);
    const optionsError = validateOptionsLikeForm(type, options);
    if (optionsError) return { ok: false, error: optionsError, index };

    const item = { type, text, options, points: normalizePoints(q?.points) };
    // نحافظ على id السؤال القديم عند التعديل عشان إجابات الطلاب السابقة تفضل مربوطة بيه
    const id = q?.id || q?._id;
    if (id && mongoose.Types.ObjectId.isValid(String(id))) item._id = String(id);
    questions.push(item);
  }
  return { ok: true, questions };
}

/** 🔒 revealAnswers=false (الطالب قبل التسليم) → من غير isCorrect خالص. */
export function serializeAssignmentQuestions(questions, { revealAnswers = false } = {}) {
  return (questions || []).map((q) => ({
    id: q._id.toString(),
    type: q.type,
    text: q.text,
    points: q.points,
    options: (q.options || []).map((o, index) =>
      revealAnswers ? { index, text: o.text, isCorrect: Boolean(o.isCorrect) } : { index, text: o.text }
    ),
  }));
}

/**
 * تصحيح تلقائي. submittedAnswers = [{ question, selectedOptionIndex }].
 * سؤال متسيّب فاضي = غلط (selectedOptionIndex: null).
 */
export function gradeAssignmentQuestions(questions, submittedAnswers) {
  const byQuestion = new Map(
    (Array.isArray(submittedAnswers) ? submittedAnswers : [])
      .filter((a) => a && a.question)
      .map((a) => [String(a.question), a])
  );

  let totalPoints = 0;
  let earnedPoints = 0;
  const answers = (questions || []).map((q) => {
    totalPoints += q.points;
    const raw = byQuestion.get(String(q._id))?.selectedOptionIndex;
    const selectedOptionIndex = Number.isInteger(raw) && raw >= 0 && raw < q.options.length ? raw : null;
    const isCorrect = selectedOptionIndex !== null && Boolean(q.options[selectedOptionIndex]?.isCorrect);
    const pointsEarned = isCorrect ? q.points : 0;
    earnedPoints += pointsEarned;
    return { question: q._id, selectedOptionIndex, isCorrect, pointsEarned };
  });

  const scorePercent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  return { answers, earnedPoints, totalPoints, scorePercent };
}

/** تحويل درجة الأسئلة لمقياس الدرجة الكاملة للواجب (maxScore)، بكسرين عشريين. */
export function scaleToMaxScore(earnedPoints, totalPoints, maxScore) {
  if (!totalPoints || totalPoints <= 0) return 0;
  return Math.round((earnedPoints / totalPoints) * maxScore * 100) / 100;
}

/** نتيجة الأسئلة للعرض (بعد التسليم — كشف الإجابة الصح مقبول وقتها). */
export function serializeQuizResult(quiz) {
  if (!quiz) return null;
  return {
    earnedPoints: quiz.earnedPoints,
    totalPoints: quiz.totalPoints,
    scorePercent: quiz.scorePercent,
    submittedAt: quiz.submittedAt,
    answers: (quiz.answers || []).map((a) => ({
      question: a.question.toString(),
      selectedOptionIndex: a.selectedOptionIndex ?? null,
      isCorrect: a.isCorrect,
      pointsEarned: a.pointsEarned,
    })),
  };
}

/** ملخص خفيف (للقوايم) — من غير تفاصيل الإجابات. */
export function summarizeQuizResult(quiz) {
  if (!quiz) return null;
  return {
    earnedPoints: quiz.earnedPoints,
    totalPoints: quiz.totalPoints,
    scorePercent: quiz.scorePercent,
  };
}

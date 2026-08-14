// app/lib/models/QuizResult.js
//
// Phase 4 — اليوم 35-36: نتيجة محاولة طالب لحل كويز معيّن. منفصلة عن
// Enrollment (بعكس completedLessons المُضمّنة هناك) لأن عدد المحاولات مش
// محدود بعدد دروس الكورس — ممكن يكبر بحرية (كل quiz.maxAttempts محاولة لكل
// طالب لكل كويز) فمينفعش يتحط كـ array مُضمّن في مستند تاني، نفس فلسفة
// Payment/Submission.
//
// 🔒 answers[].isCorrect و score بيتحسبوا وقت التصحيح في السيرفر
// (app/api/quizzes/[id]/attempt) من مقارنة الاختيارات بـ Question.options،
// مش قيم بيبعتها الطالب مع الإجابة.

import mongoose from "mongoose";
import { getOrCreateModel, USER_MODEL_NAME } from "./_helpers";

const quizResultSchema = new mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Model_quiz", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: USER_MODEL_NAME, required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Model_course", required: true },

    // نسخة من إجابات الطالب وقت التسليم — لكل سؤال: الخيار المختار (index)
    // وهل كان صح ولا لأ (محسوبة سيرفر-سايد، مش من الطالب).
    answers: [
      {
        question: { type: mongoose.Schema.Types.ObjectId, ref: "Model_question", required: true },
        selectedOptionIndex: { type: Number, default: null }, // null = سؤال اتسيب فاضي
        isCorrect: { type: Boolean, required: true },
        pointsEarned: { type: Number, required: true, default: 0 },
      },
    ],

    totalPoints: { type: Number, required: true },
    earnedPoints: { type: Number, required: true },
    scorePercent: { type: Number, required: true, min: 0, max: 100 },
    passed: { type: Boolean, required: true },

    attemptNumber: { type: Number, required: true, min: 1 },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

quizResultSchema.index({ quiz: 1, student: 1, attemptNumber: 1 }, { unique: true });
quizResultSchema.index({ student: 1, course: 1 });
quizResultSchema.index({ quiz: 1 });

export function getQuizResultModel() {
  return getOrCreateModel("quiz_result", quizResultSchema, "quiz_results");
}
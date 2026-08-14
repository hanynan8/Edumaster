// app/lib/models/Quiz.js
//
// الكويز نفسه (عنوان، إعدادات، مرتبط بكورس + درس اختياريًا). الأسئلة *مش*
// مُضمّنة هنا — دي في Question.js منفصلة، بنفس منطق Section/Lesson، عشان
// المدرس يقدر يضيف/يعدّل/يمسح سؤال من غير ما يعيد كتابة مستند الكويز كله.

import mongoose from "mongoose";
import { getOrCreateModel } from "./_helpers";

const quizSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Model_course", required: true },

    // الكويز ممكن يتربط بدرس معين (lesson.type === "quiz") أو يكون مستقل
    // على مستوى الـ section (كويز نهاية الفصل) — عشان كده الحقلين اختياريين.
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Model_lesson", default: null },
    section: { type: mongoose.Schema.Types.ObjectId, ref: "Model_section", default: null },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    timeLimitMinutes: { type: Number, default: null }, // null = بدون وقت محدد
    passingScorePercent: { type: Number, default: 60, min: 0, max: 100 },
    maxAttempts: { type: Number, default: 1, min: 1 }, // كام محاولة مسموحة للطالب

    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

quizSchema.index({ course: 1 });

export function getQuizModel() {
  return getOrCreateModel("quiz", quizSchema, "quizzes");
}

// ==========================================================================
// app/lib/models/Question.js (في نفس الملف تجنبًا لتكرار الاستيراد الدائري
// بين Quiz/Question؛ لو حبيت تفصلهم لملفين منفصلين لاحقًا الكود هيفضل شغال
// زي ما هو لأن كل موديل بيتسجل بمفتاحه الخاص في _helpers.js)
// ==========================================================================

const questionSchema = new mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Model_quiz", required: true },

    type: {
      type: String,
      enum: ["multiple_choice", "true_false"],
      required: true,
    },

    text: { type: String, required: true },

    // الخيارات مُضمّنة (embedded) لأنها محدودة العدد جدًا (2-6 خيارات) ومرتبطة
    // بالسؤال بشكل كامل — على عكس Question/Lesson اللي بتكبر بحرية.
    // 🔒 isCorrect ميترجعش أبدًا للـ client وقت عرض الكويز على الطالب (ده
    // بيتحقق منه في الـ API route وقت التصحيح، مش هنا).
    options: [
      {
        text: { type: String, required: true },
        isCorrect: { type: Boolean, required: true, default: false },
      },
    ],

    points: { type: Number, default: 1, min: 0 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

questionSchema.index({ quiz: 1, order: 1 });

export function getQuestionModel() {
  return getOrCreateModel("question", questionSchema, "questions");
}
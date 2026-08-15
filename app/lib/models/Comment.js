// app/lib/models/Comment.js
//
// Phase 6 — اليوم 48-49: "Discussions/Comments بسيطة تحت كل Lesson (سؤال
// ورد)". هيكل بسيط بمستوى رد واحد بس (مفيش nested replies لا نهائية) —
// parentComment فاضي = سؤال أصلي، parentComment موجود = رد على سؤال. ده
// كافي تمامًا لـ "سؤال ورد" زي ما مطلوب بالضبط، ومبيعقّدش الـ UI بشجرة
// تعليقات متداخلة.
//
// course متسيّب هنا (denormalized من lesson.course) لنفس سبب Lesson.js:
// نقدر نجيب كل تعليقات كورس معيّن بـ query واحد لو احتجنا (مثلاً لوحة
// إدارة تعليقات للمدرس مستقبلًا) من غير join مع lessons.

import mongoose from "mongoose";
import { getOrCreateModel, USER_MODEL_NAME } from "./_helpers";

const commentSchema = new mongoose.Schema(
  {
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Model_lesson", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Model_course", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: USER_MODEL_NAME, required: true },

    body: { type: String, required: true, trim: true, maxlength: 2000 },

    // فاضي = سؤال أصلي. موجود = رد على السؤال ده (مستوى واحد بس).
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "Model_comment", default: null },
  },
  { timestamps: true }
);

commentSchema.index({ lesson: 1, createdAt: 1 });

export function getCommentModel() {
  return getOrCreateModel("comment", commentSchema, "comments");
}
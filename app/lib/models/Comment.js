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
//
// 🆕 Moderation: أي تعليق/رد جديد بيتولد بـ status="pending" ومش بيظهر لغير
// صاحبه لحد ما أدمن يوافق عليه من /admin (لوحة "Comment Review"، نفس فلسفة
// Course Review الموجودة بالفعل). moderatedBy/moderatedAt بيتسجّلوا وقت
// الموافقة/الرفض لغرض الـ audit (مين وافق/رفض وإمتى).

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

    // 🆕 pending (الافتراضي) = لسه مستني موافقة الأدمن، مش ظاهر لغير صاحبه.
    // approved = وافق عليه الأدمن، ظاهر للكل. rejected = رفضه الأدمن، مخفي
    // للكل غير صاحبه (بيظهرله كـ "مرفوض" فقط، مش بيتمسح تلقائيًا).
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", required: true },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: USER_MODEL_NAME, default: null },
    moderatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

commentSchema.index({ lesson: 1, createdAt: 1 });
commentSchema.index({ status: 1, createdAt: 1 });

export function getCommentModel() {
  return getOrCreateModel("comment", commentSchema, "comments");
}
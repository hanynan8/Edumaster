// app/lib/models/Enrollment.js
//
// سجل تسجيل طالب في كورس. دي أهم موديل في Phase 2 — أي فحص "هل الطالب ده
// يقدر يشوف محتوى الكورس ده؟" بيمر من هنا. مش array مُضمّن جوه User (شوف
// القرار المشروح في mongodb.js) لأنه ممكن يوصل لعشرات/مئات الصفوف لكل يوزر نشط.

import mongoose from "mongoose";
import { getOrCreateModel, USER_MODEL_NAME } from "./_helpers";

const enrollmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: USER_MODEL_NAME, required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Model_course", required: true },

    // إزاي الطالب اتسجل: شراء مباشر، عن طريق membership فعالة، مجاني
    // (كورس isFree)، أو الأدمن ضافه يدويًا (منحة/استثناء).
    source: {
      type: String,
      enum: ["purchase", "membership", "free", "admin_grant"],
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },

    // 🔒 محسوبة من عدد completedLessons ÷ إجمالي دروس الكورس، مش قيمة
    // بيبعتها الـ client — بتتحدث في الـ API لما الطالب يكمل درس/كويز.
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },

    // IDs الدروس المكتملة. array محدودة بعدد دروس الكورس (عشرات لأقصى حد)،
    // فمقبول إمبيدها هنا على عكس quizResults/notifications.
    completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Model_lesson" }],

    lastAccessedLesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Model_lesson",
      default: null,
    },

    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// 🔒 SECURITY: يمنع تسجيل الطالب في نفس الكورس مرتين (race condition لو ضغط
// "اشترك" مرتين بسرعة، أو استدعاء مباشر للـ API).
enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ course: 1 });

export function getEnrollmentModel() {
  return getOrCreateModel("enrollment", enrollmentSchema, "enrollments");
}
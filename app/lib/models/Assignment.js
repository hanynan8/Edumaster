// app/lib/models/Assignment.js
//
// واجب يحطه المدرس (وصف + مرفق اختياري + ميعاد تسليم). التسليمات نفسها في
// Submission.js — نفس منطق Quiz/Question (تعريف vs محاولات الطلاب).

import mongoose from "mongoose";
import { getOrCreateModel, USER_MODEL_NAME } from "./_helpers";

const assignmentSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Model_course", required: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: "Model_section", default: null },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Model_lesson", default: null },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    attachmentUrl: { type: String, default: null }, // ملف يرفقه المدرس (تعليمات، ملف بدء، إلخ)
    // 🆕 فيديو (Bunny Stream) أو أوديو (Bunny Storage) يرفقه المدرس مع الواجب
    mediaUrl: { type: String, default: null },
    mediaType: { type: String, enum: ["video", "audio", null], default: null },

    dueDate: { type: Date, default: null }, // null = بدون ميعاد نهائي
    maxScore: { type: Number, default: 100, min: 1 },
    allowLateSubmission: { type: Boolean, default: true },

    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

assignmentSchema.index({ course: 1 });

export function getAssignmentModel() {
  return getOrCreateModel("assignment", assignmentSchema, "assignments");
}

// ==========================================================================
// Submission — تسليم الطالب لواجب معين (نفس منطق دمج Quiz+Question في ملف
// واحد؛ راجع تعليق Quiz.js)
// ==========================================================================

const submissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Model_assignment",
      required: true,
    },
    student: { type: mongoose.Schema.Types.ObjectId, ref: USER_MODEL_NAME, required: true },

    fileUrl: { type: String, default: null },
    // 🆕 تسليم بفيديو (Bunny Stream) أو أوديو (Bunny Storage)
    mediaUrl: { type: String, default: null },
    mediaType: { type: String, enum: ["video", "audio", null], default: null },
    textAnswer: { type: String, default: null },

    submittedAt: { type: Date, default: Date.now },

    // submitted: اتسلم ولسه مش متصحح | late: اتسلم بعد الميعاد | graded: اتصحح
    status: {
      type: String,
      enum: ["submitted", "late", "graded"],
      default: "submitted",
    },

    // 🔒 score/feedback/gradedBy بيتملوا بس من الـ API الخاص بالمدرس/الأدمن —
    // الطالب مش قادر يبعتهم مع تسليمه.
    score: { type: Number, default: null },
    feedback: { type: String, default: null },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: USER_MODEL_NAME, default: null },
    gradedAt: { type: Date, default: null },

    // 🆕 محادثة نصية بين الطالب والمدرّس/الموديريتر على التسليم ده (رسائل طويلة مسموحة)
    messages: [
      {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: USER_MODEL_NAME, required: true },
        senderRole: { type: String, enum: ["student", "teacher", "moderator", "admin"], required: true },
        text: { type: String, required: true, maxlength: 20000 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// 🔒 SECURITY: تسليم واحد لكل طالب لكل واجب — إعادة التسليم بتعدّل نفس
// السجل (update) بدل ما تنشئ نسخ مكررة. لو احتجنا "attempts متعددة" لاحقًا
// نشيل الـ unique ده ونضيف رقم محاولة.
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

export function getSubmissionModel() {
  return getOrCreateModel("submission", submissionSchema, "submissions");
}
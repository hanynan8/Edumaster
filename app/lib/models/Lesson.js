// app/lib/models/Lesson.js
//
// الدرس نفسه — فيديو، ملف PDF، أو محتوى نصي. بنحتفظ بـ courseId هنا كمان
// (denormalized) رغم إن الـ section أصلاً بيرجع للكورس، عشان نقدر نجيب كل
// دروس كورس معين بـ query واحد بسيط (Lesson.find({course})) من غير ما
// نعمل join مع الـ sections في كل مرة.

import mongoose from "mongoose";
import { getOrCreateModel } from "./_helpers";

const lessonSchema = new mongoose.Schema(
  {
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Model_section",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Model_course",
      required: true,
    },

    title: { type: String, required: true, trim: true },

    type: {
      type: String,
      enum: ["video", "pdf", "text", "quiz"],
      required: true,
      default: "video",
    },

    // فيديو: رابط خارجي (Bunny/YouTube/Vimeo/S3) — مش بنخزن الفيديو نفسه في Mongo
    videoUrl: { type: String, default: null },
    videoProvider: {
      type: String,
      // ✅ Day 9: أضيف "cloudinary" — القرار النهائي لتخزين الفيديوهات
      // (رفع مباشر من المتصفح، شوف app/lib/cloudinary.js)
      enum: ["youtube", "vimeo", "bunny", "s3", "cloudinary", "other", null],
      default: null,
    },
    durationSeconds: { type: Number, default: 0 },

    // PDF / ملف مرفق
    fileUrl: { type: String, default: null },

    // درس نصي (بيتخزن كـ HTML بسيط أو Markdown)
    textContent: { type: String, default: null },

    // لو type === "quiz" بيرتبط بـ Quiz document (Phase 4) — بنسيبه null دلوقتي
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Model_quiz",
      default: null,
    },

    // درس مجاني للمعاينة — يظهر حتى لغير المسجلين في الكورس (تسويقي)
    isPreview: { type: Boolean, default: false },

    order: { type: Number, default: 0, required: true },
  },
  { timestamps: true }
);

lessonSchema.index({ course: 1 });
lessonSchema.index({ section: 1, order: 1 });

export function getLessonModel() {
  return getOrCreateModel("lesson", lessonSchema, "lessons");
}
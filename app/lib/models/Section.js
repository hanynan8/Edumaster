// app/lib/models/Section.js
//
// الـ Section هي وحدة تقسيم داخل الكورس (مثال: "الفصل 1: مقدمة في React").
// كل Section بتحتوي على مجموعة Lessons (شوف Lesson.js).

import mongoose from "mongoose";
import { getOrCreateModel } from "./_helpers";

const sectionSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Model_course",
      required: true,
    },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    // ترتيب الظهور جوه الكورس (0 = الأول). بنرتب بيه بدل الاعتماد على
    // createdAt عشان المدرس يقدر يعيد ترتيب الأقسام بحرية.
    order: { type: Number, default: 0, required: true },
  },
  { timestamps: true }
);

sectionSchema.index({ course: 1, order: 1 });

export function getSectionModel() {
  return getOrCreateModel("section", sectionSchema, "sections");
}
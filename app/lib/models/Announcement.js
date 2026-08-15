// app/lib/models/Announcement.js
//
// Phase 6 — اليوم 46-47: "Announcements: المدرس ينشر إعلان على الكورس،
// يظهر لكل الطلاب المسجلين". موديل بسيط عن قصد — مفيش مسودة/جدولة نشر
// (كل إعلان بيتنشر فورًا وقت الإنشاء)، لو احتجنا كده لاحقًا يتضاف isPublished
// زي Quiz/Assignment.

import mongoose from "mongoose";
import { getOrCreateModel, USER_MODEL_NAME } from "./_helpers";

const announcementSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Model_course", required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: USER_MODEL_NAME, required: true },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 5000 },
  },
  { timestamps: true }
);

announcementSchema.index({ course: 1, createdAt: -1 });

export function getAnnouncementModel() {
  return getOrCreateModel("announcement", announcementSchema, "announcements");
}
// app/lib/models/Certificate.js
//
// الشهادة اللي بتتصدر تلقائيًا لما الطالب يكمل الكورس 100% (Phase 5).
// certificateId هو الرقم العام اللي بيظهر على الشهادة نفسها ويُستخدم في
// صفحة التحقق العامة /verify/[certId] — مش نفس الـ Mongo _id، عشان يبقى
// قابل للطباعة والمشاركة من غير ما يكشف تفاصيل داخلية عن الداتابيز.

import mongoose from "mongoose";
import crypto from "crypto";
import { getOrCreateModel, USER_MODEL_NAME } from "./_helpers";

// EDU-XXXXXXXX-XXXX — واضح إنه شهادة EduMaster، وصعب التخمين (يعتمد على
// crypto.randomBytes مش Math.random).
function generateCertificateId() {
  const part1 = crypto.randomBytes(4).toString("hex").toUpperCase();
  const part2 = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `EDU-${part1}-${part2}`;
}

const certificateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: USER_MODEL_NAME, required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Model_course", required: true },

    certificateId: {
      type: String,
      required: true,
      unique: true,
      default: generateCertificateId,
    },

    // نسخة من اسم الطالب واسم الكورس وقت الإصدار (snapshot) — عشان لو اليوزر
    // غيّر اسمه أو المدرس عدّل عنوان الكورس بعدين، الشهادة الصادرة فعلاً
    // تفضل زي ما اتصدرت بالظبط، مش تتغير بأثر رجعي.
    studentNameSnapshot: { type: String, required: true },
    courseTitleSnapshot: { type: String, required: true },

    issuedAt: { type: Date, default: Date.now },
    pdfUrl: { type: String, default: null }, // رابط ملف الـ PDF المولّد
  },
  { timestamps: true }
);

// طالب واحد ميقدرش ياخد شهادة مكررة لنفس الكورس
certificateSchema.index({ user: 1, course: 1 }, { unique: true });

export function getCertificateModel() {
  return getOrCreateModel("certificate", certificateSchema, "certificates");
}
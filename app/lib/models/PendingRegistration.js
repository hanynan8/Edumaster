// app/lib/models/PendingRegistration.js
//
// 🆕 تسجيل معلّق: لما حد يعمل Sign up بإيميل جديد، مش بنعمل الحساب فورًا —
// بنخزّن بياناته هنا مؤقتًا (الباسورد متشفّر، والكود متخزّن كـ hash بس) وبنبعت
// كود من 6 أرقام على الإيميل. الحساب الحقيقي (كولكشن auth) مابيتعملش غير بعد
// ما الكود يتأكد في /api/register/verify. كده إيميل وهمي أو بتاع حد تاني عمره
// ما هيتحوّل لحساب، ومش بيحجز اسم/إيميل حد حقيقي.
//
// الصف بيتمسح تلقائيًا بعد ساعة من أول تسجيل (TTL index على createdAt).

import mongoose from "mongoose";
import { getOrCreateModel } from "./_helpers";

const pendingRegistrationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },

    // 🔒 الكود نفسه عمره ما بيتخزن — hash بس، زي باسورد الـ reset.
    codeHash: { type: String, required: true },
    codeExpiry: { type: Date, required: true },

    // محاولات تخمين الكود الحالي (بتتصفّر لما يتبعت كود جديد).
    attempts: { type: Number, default: 0 },
    // كام مرة اتبعت كود لنفس الإيميل خلال عمر الصف ده (أول مرة + resend).
    sendCount: { type: Number, default: 1 },
    lastSentAt: { type: Date, default: Date.now },

    createdAt: { type: Date, default: Date.now, expires: 60 * 60 }, // TTL: ساعة
  },
  { versionKey: false }
);

pendingRegistrationSchema.index({ email: 1 }, { unique: true });

export function getPendingRegistrationModel() {
  return getOrCreateModel(
    "pending_registration",
    pendingRegistrationSchema,
    "pending_registrations"
  );
}

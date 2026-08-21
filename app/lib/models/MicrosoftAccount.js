// app/lib/models/MicrosoftAccount.js
//
// 🆕 حساب Microsoft مربوط بمدرس معيّن — نتيجة OAuth flow (شوف
// app/lib/microsoftGraph.js لتفاصيل الـ flow الكامل). بيخزن التوكنات
// اللازمة عشان ننشئ اجتماعات Teams نيابة عن المدرس تلقائيًا، من غير ما
// يفتح Teams بنفسه في كل مرة (بعكس الرابط اليدوي القديم في Meeting.link).
//
// 🔒 SECURITY: refreshTokenEncrypted مخزّن مشفّر (AES-256-GCM عن طريق
// encryptSecret/decryptSecret في microsoftGraph.js) — ده توكن طويل العمر
// (شهور)، لو حد وصل لنسخة من الداتابيز بس من غير مفتاح التشفير
// (MS_TOKEN_ENCRYPTION_KEY) مايقدرش يستخدمه. accessToken قصير العمر
// (~ساعة) فبيتخزن عادي (مش هيفيد حد يسرقه بعد فترة قصيرة، وبيتجدد تلقائيًا).
//
// علاقة 1-إلى-1: كل مدرس (teacher) ليه حساب Microsoft واحد مربوط بس —
// index unique على teacher.

import mongoose from "mongoose";
import { getOrCreateModel, USER_MODEL_NAME } from "./_helpers";

const microsoftAccountSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: USER_MODEL_NAME,
      required: true,
      unique: true,
    },

    // بيانات عرض بس (مش سرية) — عشان نوري المدرس "حسابك مربوط بـ ...".
    microsoftDisplayName: { type: String, default: "" },
    microsoftEmail: { type: String, default: "" },

    // access_token الحالي — عمره قصير، بيتجدد تلقائيًا من
    // getValidAccessTokenForTeacher وقت الحاجة.
    accessToken: { type: String, required: true },
    accessTokenExpiresAt: { type: Date, required: true },

    // refresh_token مشفّر (base64: iv + authTag + ciphertext) — شوف
    // encryptSecret في app/lib/microsoftGraph.js.
    refreshTokenEncrypted: { type: String, required: true },
  },
  { timestamps: true }
);

export function getMicrosoftAccountModel() {
  return getOrCreateModel("microsoft_account", microsoftAccountSchema, "microsoft_accounts");
}
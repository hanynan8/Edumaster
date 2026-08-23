// app/lib/models/Meeting.js
//
// 🆕 محاضرات لايف (Meetings) لكورس معيّن، مع معاد وتاريخ. الطلاب المسجلين
// في الكورس بيشوفوها في صفحة /meet ويقدروا يدخلوا عليها وقت المحاضرة.
//
// 🔄 مصدرين لرابط الاجتماع (شوف حقل `source` تحت):
//   - "daily": الرابط اتولّد تلقائيًا عن طريق Daily.co API (Rooms) —
//     شوف app/lib/daily.js. دي الطريقة الافتراضية/الاحترافية، شغالة لأي
//     مدرس بمجرد ما DAILY_API_KEY يبقى مضبوط على السيرفر، من غير أي
//     ربط حساب أو OAuth من ناحية المدرس نفسه.
//   - "manual": fallback لو Daily مش متظبط على السيرفر، أو لو إنشاء
//     الغرفة فشل مؤقتًا — المدرس يلزق رابط اجتماع (Daily أو أي منصة
//     تانية) بنفسه. بنسيب المسار ده متاح عشان الميزة متتقفلش لو حصلت
//     مشكلة في التكامل التلقائي.

import mongoose from "mongoose";
import { getOrCreateModel, USER_MODEL_NAME } from "./_helpers";

const meetingSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Model_course", required: true },

    // 🔒 صاحب الاجتماع — بنخزنه مباشرة هنا (زي Announcement.teacher) بدل ما
    // نرجع نجيب course.teacher في كل فحص صلاحية؛ وبيفضل يوضّح "مين المفروض
    // يبقى معاه الاجتماع" حتى لو الكورس اتحذف لاحقًا.
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: USER_MODEL_NAME, required: true },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 2000 },

    // رابط الانضمام للاجتماع — إما متولّد تلقائيًا (source: "daily") أو
    // ملزوق يدويًا من المدرس (source: "manual"). بنتحقق إنه رابط http(s)
    // صالح بس — مش بنجبر دومين daily.co تحديدًا، عشان بعض المدرسين ممكن
    // يستخدموا منصة تانية في المسار اليدوي ومش عايزين نرفض روابط شغالة
    // فعليًا بسبب فحص صارم زيادة.
    link: { type: String, required: true, trim: true },

    // 🆕 مصدر الرابط — بيتحدد في الـ API route وقت الإنشاء، مش المدرس بيختاره.
    source: { type: String, enum: ["daily", "manual"], default: "manual" },

    // 🆕 اسم الغرفة في Daily.co — موجود بس لو source === "daily". مفيد
    // عشان نقدر نمسح/نلغي الغرفة الأصلية في Daily (DELETE /rooms/{name})
    // مش بس نمسحها من عندنا (شوف deleteDailyRoom في app/lib/daily.js).
    dailyRoomName: { type: String, default: null },

    scheduledAt: { type: Date, required: true },

    // مدة تقريبية بالدقايق — بتستخدم بس لحساب "لسه هيبدأ / شغال دلوقتي /
    // خلص" في الواجهة (شوف app/meet/page.jsx)، مش بترسل تذكير أو أي حاجة
    // زمنية فعلية.
    durationMinutes: { type: Number, default: 60, min: 5, max: 480 },
  },
  { timestamps: true }
);

// الاستعلام الأساسي: اجتماعات كورس معيّن أو مدرس معيّن، مرتبة بالمعاد.
meetingSchema.index({ course: 1, scheduledAt: 1 });
meetingSchema.index({ teacher: 1, scheduledAt: 1 });

export function getMeetingModel() {
  return getOrCreateModel("meeting", meetingSchema, "meetings");
}
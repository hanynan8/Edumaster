// app/lib/models/Meeting.js
//
// 🆕 محاضرات لايف (Meetings) — المدرس بيضيف رابط اجتماع Microsoft Teams
// (يدوي: بيعمله بنفسه من حسابه الشخصي/المؤسسي وينسخ اللينك) لكورس معيّن،
// مع معاد وتاريخ. الطلاب المسجلين في الكورس بيشوفوه في صفحة /meet
// ويقدروا يدخلوا عليه وقت المحاضرة.
//
// 🔒 القرار ده مقصود بسيط عن قصد (يدوي، مش عن طريق Microsoft Graph API):
// مش كل مدرس عنده حساب Microsoft 365 برخصة Teams مدفوعة (شرط أساسي لأي
// تكامل API حقيقي بيعمل اجتماعات تلقائيًا). فبدل ما الميزة تتقفل على
// المدرسين اللي عندهم اشتراك بس، أي مدرس يقدر يستخدمها — يعمل اجتماع
// Teams عادي بحسابه (حتى لو مجاني) وينسخ اللينك هنا. لو المشروع لاحقًا
// عمل Azure AD App Registration + حساب مؤسسي برخصة Teams، ممكن نضيف
// إنشاء تلقائي للاجتماعات عن طريق Microsoft Graph (Online Meetings API)
// من غير ما نغيّر شكل الموديل ده (هيفضل فيه link يتخزن، بس هيتولّد تلقائي
// بدل ما يتلصق يدوي).

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

    // رابط اجتماع Teams يدوي (المدرس بيلزقه بنفسه). بنتحقق إنه رابط http(s)
    // صالح بس — مش بنجبر دومين teams.microsoft.com تحديدًا، عشان بعض
    // الروابط المؤسسية بتتوزع عن طريق نطاقات مختصرة (aka.ms, custom domain
    // redirect...) ومش عايزين نرفض روابط شغالة فعليًا بسبب فحص صارم زيادة.
    link: { type: String, required: true, trim: true },

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
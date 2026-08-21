// app/lib/models/Meeting.js
//
// 🆕 محاضرات لايف (Meetings) لكورس معيّن، مع معاد وتاريخ. الطلاب المسجلين
// في الكورس بيشوفوها في صفحة /meet ويقدروا يدخلوا عليها وقت المحاضرة.
//
// 🔄 التحديث: بقى فيه مصدرين لرابط الاجتماع (شوف حقل `source` تحت):
//   - "graph": الرابط اتولّد تلقائيًا عن طريق Microsoft Graph API (Online
//     Meetings) بعد ما المدرس ربط حساب Microsoft بتاعه مرة واحدة — شوف
//     app/lib/microsoftGraph.js و app/api/integrations/microsoft/*.
//     دي الطريقة الافتراضية/الاحترافية لمين عنده حساب مربوط.
//   - "manual": fallback للمدرسين اللي لسه ما ربطوش حسابهم (أو مش عايزين) —
//     بيعملوا اجتماع Teams (أو Zoom أو أي منصة) بنفسهم وينسخوا اللينك هنا،
//     بالظبط زي السلوك القديم. بنسيب المسار ده متاح عشان الميزة متتقفلش
//     على مين عنده تكامل Microsoft بس.

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

    // رابط الانضمام للاجتماع — إما متولّد تلقائيًا (source: "graph") أو
    // ملزوق يدويًا من المدرس (source: "manual"). بنتحقق إنه رابط http(s)
    // صالح بس — مش بنجبر دومين teams.microsoft.com تحديدًا، عشان بعض
    // الروابط المؤسسية بتتوزع عن طريق نطاقات مختصرة (aka.ms, custom domain
    // redirect...) ومش عايزين نرفض روابط شغالة فعليًا بسبب فحص صارم زيادة.
    link: { type: String, required: true, trim: true },

    // 🆕 مصدر الرابط — بيتحدد في الـ API route وقت الإنشاء، مش المدرس بيختاره.
    source: { type: String, enum: ["graph", "manual"], default: "manual" },

    // 🆕 معرّف الاجتماع في Microsoft Graph — موجود بس لو source === "graph".
    // مفيد لو حبينا لاحقًا نلغي/نعدّل الاجتماع الأصلي في Teams (PATCH/DELETE
    // على /me/onlineMeetings/{id}) مش بس نمسحه من عندنا.
    graphMeetingId: { type: String, default: null },

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
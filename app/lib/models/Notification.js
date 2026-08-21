// app/lib/models/Notification.js
//
// Phase 6 — اليوم 50-51: "نظام Notifications داخلي (جرس إشعارات)". إشعار
// واحد بيخص مستخدم واحد بس (مش broadcast مُضمّن — لو حدث بيهم أكتر من
// مستخدم، زي إعلان كورس لكل الطلاب المسجلين، بيتعمل insertMany بسجل منفصل
// لكل مستقبِل، شوف notificationHelpers.js). القرار ده بسّط كتير: مفيش حاجة
// اسمها "قروب إشعارات مشتركة" ولا logic تتبع "مين قراها من مين" — كل صف هنا
// isRead بيخص صاحبه هو بس.
//
// type بيحدد شكل الأيقونة/اللون في الواجهة وبيوضّح مصدر الإشعار من غير ما
// نحتاج نفتح link عشان نعرف نوعه.

import mongoose from "mongoose";
import { getOrCreateModel, USER_MODEL_NAME } from "./_helpers";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: USER_MODEL_NAME, required: true },

    type: {
      type: String,
      enum: [
        "enrollment_new", // طالب جديد سجّل (للمدرس)
        "quiz_result", // نتيجة كويز (للطالب)
        "assignment_graded", // تصحيح واجب (للطالب)
        "certificate_issued", // شهادة جديدة (للطالب)
        "announcement_new", // إعلان جديد على كورس (لكل طالب مسجل)
        "comment_reply", // رد على تعليق (لصاحب التعليق الأصلي)
        "comment_question", // سؤال جديد تحت درس (للمدرس)
        "payment_succeeded", // دفع ناجح (للطالب)
        "course_pending_review", // 🆕 مدرس نشر كورس وبينتظر مراجعة (لكل الأدمنز)
        "course_approved", // 🆕 الأدمن وافق على نشر الكورس (للمدرس صاحب الكورس)
        "course_rejected", // 🆕 الأدمن رفض الكورس وحذفه (للمدرس صاحب الكورس)
      ],
      required: true,
    },

    title: { type: String, required: true },
    message: { type: String, default: "" },

    // رابط نسبي (بدون origin) يودّي المستخدم لمكان الحدث لما يضغط على
    // الإشعار — مثلاً /courses/<id> أو /student/quizzes/<id>.
    link: { type: String, default: null },

    // مرجع اختياري لكورس متعلق بالإشعار — مفيد لو حبينا نعمل فلترة/تجميع
    // لاحقًا (مش مستخدم في الـ UI الحالي).
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Model_course", default: null },

    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// الاستعلام الأساسي دايمًا "إشعارات المستخدم ده، الأحدث الأول" — وفلتر
// "غير المقروءة بس" لعداد الجرس.
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });

export function getNotificationModel() {
  return getOrCreateModel("notification", notificationSchema, "notifications");
}
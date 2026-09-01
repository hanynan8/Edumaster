// app/lib/models/Message.js
//
// 🆕 رسائل مباشرة بين طالب ومدرس كورسه — مختلفة عن Comment.js (اللي هو
// نقاش عام تحت درس معيّن وبيحتاج موافقة أدمن). هنا محادثة خاصة 1-to-1 في
// سياق كورس واحد، بتتفتح من الطالب (هو اللي يقدر يبدأ محادثة جديدة)،
// والمدرس (أو أدمن) بيقدر يرد عليها بس مش يبدأ واحدة جديدة من الصفر —
// شوف app/api/courses/[id]/messages/route.js.
//
// course + student مع بعض بيحددوا "الخيط" (thread) الفريد — مفيش حاجة اسمها
// محادثة من غير سياق كورس (زي ما اتطلب: "رسالة للتيتشر بتاع الكورس بتاعه").
// teacher متسيّب هنا denormalized من course.teacher وقت إنشاء أول رسالة —
// بيسهّل query "كل رسايل المدرس ده" (inbox) من غير join مع courses في كل مرة.

import mongoose from "mongoose";
import { getOrCreateModel, USER_MODEL_NAME } from "./_helpers";

const messageSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Model_course", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: USER_MODEL_NAME, required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: USER_MODEL_NAME, required: true },

    // مين كتب الرسالة دي بالذات (الطالب ولا المدرس) — الطرف التاني هو
    // المستقبِل الفعلي (يُحسب وقت الحاجة، مش متسيّب هنا كحقل مستقل).
    sender: { type: mongoose.Schema.Types.ObjectId, ref: USER_MODEL_NAME, required: true },

    body: { type: String, required: true, trim: true, maxlength: 3000 },

    // اتقرت من الطرف التاني (مش صاحبها) ولا لسه؟ بتتحدث لـ true وقت ما
    // الطرف التاني يفتح الخيط (GET) — شوف الـ route.
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// خيط محادثة (course, student) بالترتيب الزمني — الاستعلام الأساسي لفتح
// محادثة. teacher+isRead+createdAt لصندوق وارد المدرس (unread badge + ترتيب
// أحدث نشاط)، ونفس الفكرة لصندوق وارد الطالب.
messageSchema.index({ course: 1, student: 1, createdAt: 1 });
messageSchema.index({ teacher: 1, isRead: 1, createdAt: -1 });
messageSchema.index({ student: 1, isRead: 1, createdAt: -1 });

export function getMessageModel() {
  return getOrCreateModel("message", messageSchema, "messages");
}
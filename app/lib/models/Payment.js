// app/lib/models/Payment.js
//
// سجل كل عملية دفع (شراء كورس مفرد أو اشتراك membership). ده الـ source of
// truth المالي — لا الـ Enrollment ولا user.membership بيتحدثوا إلا بعد ما
// يتسجل هنا Payment بحالة "succeeded" (عادة من webhook بوابة الدفع، Phase 3).

import mongoose from "mongoose";
import { getOrCreateModel, USER_MODEL_NAME } from "./_helpers";

const paymentSchema = new mongoose.Schema(
  {
    // 🆕 GetPayIn + استشارات: طلب الاستشارة (ConsultationForm) بيتبعت من غير
    // تسجيل دخول (زي فورم التواصل)، فـ "user" مبقاش required — دفعات
    // النوع "consultation" بتفضل user=null، وبنستخدم guestName/guestEmail
    // تحت بدالها للعرض في صفحة النجاح/الإيصال. دفعات course/membership
    // لسه لازم لها user زي ما هي (بتتطلب تسجيل دخول أصلاً في checkout/route.js).
    user: { type: mongoose.Schema.Types.ObjectId, ref: USER_MODEL_NAME, default: null },

    type: { type: String, enum: ["course", "membership", "consultation"], required: true },

    // واحد من التلاتة بيتملى حسب type، مش أكتر من واحد مع بعض
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Model_course", default: null },
    membershipPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Model_membership_plan",
      default: null,
    },
    // 🆕 مرجع لمستند الاستشارة في كولكشن "consultations" (كولكشن عام بسكيمة
    // مرنة، شوف app/api/data/route.js — مفيش موديل mongoose ثابت ليه، فمفيش
    // "ref" هنا، بس الـ ObjectId بيتخزن عشان الربط والتحديث بعد نجاح الدفع).
    consultation: { type: mongoose.Schema.Types.ObjectId, default: null },

    // 🆕 بيانات ضيف (Guest) للدفعات اللي مالهاش user مسجّل (النوع
    // "consultation" حاليًا) — مأخوذة من فورم الاستشارة نفسه (firstName+
    // lastName، email) عشان نعرض "الفاتورة باسم" في صفحة النجاح/الإيصال
    // بدل الاعتماد على populate("user") اللي هيرجع null هنا.
    guestName: { type: String, default: null },
    guestEmail: { type: String, default: null },

    // المبلغ بالقروش/السنت — نفس منطق Course.price
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "EGP" },

    // pending: بدأت العملية ولسه مفيش تأكيد | succeeded: نجحت وتم تفعيل
    // الوصول | failed: فشلت | refunded: تم استرجاعها بعد النجاح
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed", "refunded"],
      default: "pending",
      required: true,
    },

    // 🆕 "getpayin" هي بوابة الدفع الوحيدة الفعلية المستخدمة في المشروع
    // (app/lib/getpayin.js) بعد استبدال Paymob بالكامل. باقي القيم
    // (stripe/fawry) اتسابت في الـ enum لمرونة مستقبلية بس مفيش تكامل فعلي
    // ليها دلوقتي. "manual" لسه مستخدمة في app/api/admin/users/[id]/membership
    // للتفعيل اليدوي. سجلات قديمة كانت provider="paymob" أو "paypal" ممكن
    // تفضل موجودة تاريخيًا في الداتابيز (مش بتتمسح) بس مفيش كود جديد بيكتب
    // "paymob" أو "paypal" تاني.
    provider: {
      type: String,
      enum: ["getpayin", "paymob", "stripe", "paypal", "fawry", "manual"],
      required: true,
    },

    // 🔒 SECURITY: معرّف العملية عند بوابة الدفع نفسها — بيتستخدم للتحقق من
    // الـ webhook (منع تزوير "نجاح دفع" وهمي من الـ client) ولمنع معالجة
    // نفس الحدث مرتين (idempotency). unique + sparse عشان السجلات القديمة
    // اللي لسه pending ومفيش لها providerPaymentId متتعارضش مع بعض.
    providerPaymentId: { type: String, default: undefined },

    invoiceNumber: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    paidAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ user: 1, status: 1 });

export function getPaymentModel() {
  return getOrCreateModel("payment", paymentSchema, "payments");
}
// app/lib/models/Payment.js
//
// سجل كل عملية دفع (شراء كورس مفرد أو اشتراك membership). ده الـ source of
// truth المالي — لا الـ Enrollment ولا user.membership بيتحدثوا إلا بعد ما
// يتسجل هنا Payment بحالة "succeeded" (عادة من webhook بوابة الدفع، Phase 3).

import mongoose from "mongoose";
import { getOrCreateModel, USER_MODEL_NAME } from "./_helpers";

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: USER_MODEL_NAME, required: true },

    type: { type: String, enum: ["course", "membership"], required: true },

    // واحد من الاتنين بيتملى حسب type، مش الاتنين مع بعض
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Model_course", default: null },
    membershipPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Model_membership_plan",
      default: null,
    },

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

    provider: {
      type: String,
      enum: ["stripe", "paymob", "fawry", "manual"],
      required: true,
    },

    // 🔒 SECURITY: معرّف العملية عند بوابة الدفع نفسها — بيتستخدم للتحقق من
    // الـ webhook (منع تزوير "نجاح دفع" وهمي من الـ client) ولمنع معالجة
    // نفس الحدث مرتين (idempotency). unique + sparse عشان السجلات القديمة
    // اللي لسه pending ومفيش لها providerPaymentId متتعارضش مع بعض.
    providerPaymentId: { type: String, default: null },

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
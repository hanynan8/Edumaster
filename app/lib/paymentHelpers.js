// app/lib/paymentHelpers.js
//
// منطق مشترك بعد نجاح/فشل/استرجاع أي عملية دفع، مستخدم من
// app/api/payments/paymob/callback و app/api/payments/paymob/webhook مع
// بعض — المفروض الاتنين يودّوا لنفس النتيجة بالظبط مهما كان مين وصل الأول
// (المستخدم لما يرجع لمتصفحه، أو الـ webhook من Paymob).
//
// 🔒 markPaymentSucceededAndGrantAccess هي القلب: بتعمل transition
// pending → succeeded بشكل atomic (findOneAndUpdate بشرط status:"pending")
// — لو حصل إن الاتنين (return route + webhook) نادوها على نفس الدفعة في
// نفس اللحظة تقريبًا، واحد بس هيلاقي الشرط بيتحقق وهو اللي هيعمل التفعيل
// (Enrollment/membership)؛ التاني هيلاقي الدفعة already succeeded ومش
// هيكرر أي حاجة. ده هو "مصدر الحقيقة المالي" المشروح في تعليق Payment.js.

import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import {
  getPaymentModel,
  getEnrollmentModel,
  getCourseModel,
  getMembershipPlanModel,
} from "@/app/lib/models";
import { createNotification } from "@/app/lib/notificationHelpers";
import { sendPaymentSucceededEmail } from "@/app/lib/emailHelpers";

export function generateInvoiceNumber(paymentId) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const suffix = paymentId.toString().slice(-6).toUpperCase();
  return `INV-${y}${m}${d}-${suffix}`;
}

// يضيف دورة فوترة واحدة (شهر/سنة) فوق تاريخ معين — بيستخدم تقويم حقيقي
// (setMonth/setFullYear) مش "+30/+365 يوم" ثابتين، عشان الشهور المتفاوتة الطول.
export function addBillingCycle(baseDate, billingCycle) {
  const d = new Date(baseDate);
  if (billingCycle === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1); // "monthly" أو أي قيمة تانية غير "yearly"
  return d;
}

async function grantCourseAccess(payment) {
  const Enrollment = getEnrollmentModel();
  const existing = await Enrollment.findOne({ user: payment.user, course: payment.course });
  if (existing) return; // اتسجل بالفعل بطريقة تانية (نادر) — من غير داعي نكرر

  try {
    await Enrollment.create({
      user: payment.user,
      course: payment.course,
      source: "purchase",
      status: "active",
    });
    const Course = getCourseModel();
    await Course.findByIdAndUpdate(payment.course, { $inc: { studentsCount: 1 } });
  } catch (err) {
    // race condition نادرة (unique index على user+course في Enrollment) —
    // لو حصلت يبقى فعلاً اتسجل من مكان تاني في نفس اللحظة، مفيش مشكلة حقيقية.
    if (err?.code !== 11000) throw err;
  }
}

async function grantMembershipAccess(payment) {
  const AuthModel = getAuthModel();
  const MembershipPlan = getMembershipPlanModel();

  const [user, plan] = await Promise.all([
    AuthModel.findById(payment.user),
    MembershipPlan.findById(payment.membershipPlan).lean(),
  ]);
  if (!user) return;

  const billingCycle = payment.metadata?.billingCycle || plan?.billingCycle || "monthly";
  const previous = user.membership || {};
  const samePlanStillActive =
    previous.plan &&
    previous.plan.toString() === payment.membershipPlan.toString() &&
    previous.status === "active" &&
    previous.expiresAt &&
    new Date(previous.expiresAt).getTime() > Date.now();

  // لو لسه عنده وقت متبقي من نفس الخطة، الدفعة الجديدة (تجديد) بتمدد من
  // تاريخ الانتهاء الحالي مش تبدأ من الصفر — نفس منطق extendDays اليدوي
  // بتاع الأدمن في app/api/admin/users/[id]/membership. لو خطة مختلفة
  // (ترقية/تخفيض)، العضوية الجديدة بتبدأ دلوقتي.
  const base = samePlanStillActive ? new Date(previous.expiresAt) : new Date();

  user.membership = {
    plan: payment.membershipPlan,
    status: "active",
    startedAt: samePlanStillActive ? previous.startedAt : new Date(),
    expiresAt: addBillingCycle(base, billingCycle),
  };
  await user.save();
}

/**
 * بتحول الدفعة لـ "succeeded" (مرة واحدة بس، atomic) وتفعّل الوصول المناسب
 * (Enrollment لكورس، أو تفعيل/تمديد membership). آمنة تُنادى أكتر من مرة
 * لنفس الدفعة — المرة التانية مش هتعمل أي حاجة (بترجع الدفعة زي ما هي).
 */
export async function markPaymentSucceededAndGrantAccess(paymentId, { providerPaymentId, captureId } = {}) {
  await connectToMongo();
  const Payment = getPaymentModel();

  const invoiceNumber = generateInvoiceNumber(paymentId);
  const updated = await Payment.findOneAndUpdate(
    { _id: paymentId, status: "pending" },
    {
      $set: {
        status: "succeeded",
        paidAt: new Date(),
        providerPaymentId,
        invoiceNumber,
        "metadata.captureId": captureId || null,
      },
    },
    { new: true }
  );

  if (!updated) {
    // مش pending دلوقتي (اتعالجت قبل كده، أو فشلت/اتلغت) — مفيش داعي نكرر التفعيل
    return Payment.findById(paymentId).lean();
  }

  if (updated.type === "course") {
    await grantCourseAccess(updated);
  } else if (updated.type === "membership") {
    await grantMembershipAccess(updated);
  }

  // 🔔 Phase 6 — اليوم 52 (اختياري): إشعار داخلي + إيميل "نجاح دفع".
  // best-effort بالكامل ومقصود (زي باقي best-effort helpers في الملف ده):
  // فشل الإشعار/الإيميل (مشكلة عابرة في الداتابيز أو عند Resend) ميرجعش
  // يبوّظ الدفعة اللي نجحت فعليًا ووصولها اتفعّل بالفعل فوق.
  try {
    await notifyPaymentSucceeded(updated);
  } catch (err) {
    console.error("[markPaymentSucceededAndGrantAccess] notify error:", err);
  }

  return updated;
}

async function notifyPaymentSucceeded(payment) {
  const AuthModel = getAuthModel();
  const user = await AuthModel.findById(payment.user, "name email").lean();
  if (!user) return;

  let itemLabel = "your purchase";
  if (payment.type === "course") {
    const Course = getCourseModel();
    const course = await Course.findById(payment.course, "title").lean();
    itemLabel = course?.title || itemLabel;
  } else if (payment.type === "membership") {
    const MembershipPlan = getMembershipPlanModel();
    const plan = await MembershipPlan.findById(payment.membershipPlan, "name").lean();
    itemLabel = plan?.name || "your membership";
  }

  await createNotification({
    user: payment.user,
    type: "payment_succeeded",
    title: "Payment successful",
    message: itemLabel,
    link: payment.type === "course" ? `/courses/${payment.course}` : "/student/payments",
    course: payment.type === "course" ? payment.course : null,
  });

  if (user.email) {
    await sendPaymentSucceededEmail({
      toEmail: user.email,
      name: user.name || "there",
      itemLabel,
      amount: payment.amount,
      currency: payment.currency,
      invoiceNumber: payment.invoiceNumber,
    });
  }
}

export async function markPaymentFailed(paymentId, reason) {
  await connectToMongo();
  const Payment = getPaymentModel();
  return Payment.findOneAndUpdate(
    { _id: paymentId, status: "pending" },
    { $set: { status: "failed", "metadata.failureReason": reason } },
    { new: true }
  );
}

export async function markPaymentRefunded(paymentId) {
  await connectToMongo();
  const Payment = getPaymentModel();
  // ⚠️ قرار مقصود: بنسجل الاسترجاع في السجل المالي بس، ومنشيلش
  // Enrollment/membership تلقائيًا — استرجاع فلوس مش لازم يبقى معناه إلغاء
  // وصول فوري (ممكن يكون استرجاع جزئي، أو نزاع قيد المراجعة). الأدمن يقدر
  // يلغي الوصول يدويًا من لوحته لو قرر كده (users panel / membership route).
  return Payment.findOneAndUpdate(
    { _id: paymentId, status: "succeeded" },
    { $set: { status: "refunded", refundedAt: new Date() } },
    { new: true }
  );
}
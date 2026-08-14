// app/api/payments/paypal/return/route.js
//
// Phase 3 — اليوم 27-30: نقطة الرجوع من PayPal بعد ما المستخدم يوافق (أو
// يلغي) عملية الدفع في صفحة PayPal نفسها. ده الـ returnUrl/cancelUrl اللي
// بنبعتهم لـ createPaypalOrder في app/api/payments/checkout.
//
// PayPal بيرجّع هنا بـ query params:
//   ?token=<orderId>&PayerID=<...>   → المستخدم وافق، جاهزين للـ capture
//   ?cancelled=1                     → المستخدم لغى من صفحة PayPal (زرار
//                                       "Cancel and return to EduMaster")
//
// 🔒 مهم: الـ capture هنا مش هي المصدر الوحيد للحقيقة — webhook route
// (app/api/payments/webhook) بيعمل نفس التأكيد لو المستخدم قفل التبويب قبل
// ما يرجع لموقعنا. الاتنين بينادوا نفس الدالة الآمنة
// markPaymentSucceededAndGrantAccess (شوف app/lib/paymentHelpers.js)
// فمفيش تكرار في التفعيل مهما مين وصل الأول (findOneAndUpdate بشرط
// status:"pending" في الدالة نفسها).

import { NextResponse } from "next/server";
import { connectToMongo } from "@/app/lib/mongodb";
import { getPaymentModel } from "@/app/lib/models";
import { capturePaypalOrder } from "@/app/lib/paypal";
import { markPaymentSucceededAndGrantAccess, markPaymentFailed } from "@/app/lib/paymentHelpers";

function redirectFailed(origin, reason) {
  return NextResponse.redirect(`${origin}/payments/failed?reason=${encodeURIComponent(reason)}`);
}

export async function GET(request) {
  const { origin, searchParams } = new URL(request.url);

  try {
    // المستخدم لغى من صفحة PayPal — نسجّل الفشل لو لاقينا الدفعة، ونوجّهه
    // لصفحة "لم تكتمل" برسالة واضحة.
    if (searchParams.get("cancelled") === "1") {
      const orderId = searchParams.get("token");
      if (orderId) {
        await connectToMongo();
        const Payment = getPaymentModel();
        const payment = await Payment.findOne({ providerPaymentId: orderId, status: "pending" });
        if (payment) await markPaymentFailed(payment._id, "cancelled_by_user");
      }
      return redirectFailed(origin, "cancelled");
    }

    const orderId = searchParams.get("token"); // PayPal بيسمي order id "token" في return URL
    if (!orderId) return redirectFailed(origin, "missing_token");

    await connectToMongo();
    const Payment = getPaymentModel();
    const payment = await Payment.findOne({ providerPaymentId: orderId });
    if (!payment) return redirectFailed(origin, "not_found");

    // idempotent: لو الدفعة اتعالجت بالفعل (مثلاً webhook سبقنا في نفس
    // اللحظة)، مفيش داعي نعمل capture تاني — نودّي المستخدم على طول
    // لصفحة النجاح.
    if (payment.status === "succeeded") {
      return NextResponse.redirect(`${origin}/payments/success?payment=${payment._id.toString()}`);
    }
    if (payment.status !== "pending") {
      return redirectFailed(origin, "not_completed");
    }

    let order;
    try {
      order = await capturePaypalOrder(orderId);
    } catch (err) {
      console.error("[/api/payments/paypal/return] capture failed:", err);
      await markPaymentFailed(payment._id, "capture_failed");
      return redirectFailed(origin, "capture_failed");
    }

    const captureStatus = order?.purchase_units?.[0]?.payments?.captures?.[0]?.status || order?.status;
    if (captureStatus !== "COMPLETED") {
      await markPaymentFailed(payment._id, "not_completed");
      return redirectFailed(origin, "not_completed");
    }

    const captureId = order?.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;
    await markPaymentSucceededAndGrantAccess(payment._id, { providerPaymentId: orderId, captureId });

    return NextResponse.redirect(`${origin}/payments/success?payment=${payment._id.toString()}`);
  } catch (err) {
    console.error("[/api/payments/paypal/return] GET error:", err);
    return redirectFailed(origin, "internal_error");
  }
}
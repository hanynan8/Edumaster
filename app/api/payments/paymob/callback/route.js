// app/api/payments/paymob/callback/route.js
//
// 🆕 نقطة الرجوع من Paymob بعد ما المستخدم يدفع (أو يلغي) في صفحة الدفع
// المستضافة عند Paymob — نظير app/api/payments/paypal/return بالظبط، بس
// لبوابة Paymob. ده الـ "Transaction Response Callback" في إعدادات Paymob
// (Dashboard → Payment Integrations → Integration المستخدمة → Transaction
// response callback)، لازم يتظبط على:
//   https://<domain>/api/payments/paymob/callback
//
// Paymob بيرجّع هنا بـ GET query params flat (success, id, order,
// merchant_order_id, hmac, ...) — مختلف عن شكل الـ webhook (POST JSON).
//
// 🔒 مهم: زي PayPal بالظبط، الرجوع هنا مش المصدر الوحيد للحقيقة —
// app/api/payments/paymob/webhook (server-to-server) بيعمل نفس التأكيد لو
// المستخدم قفل التبويب قبل ما يرجع لموقعنا. الاتنين بينادوا نفس الدالة
// الآمنة markPaymentSucceededAndGrantAccess (app/lib/paymentHelpers.js).
//
// 🔒 SECURITY: بنتحقق من الـ HMAC بتاع Paymob (verifyPaymobCallbackHmac)
// قبل ما نصدّق أي حاجة من الـ query params — أي حد يقدر يزور رابط بنفس
// الشكل، فالتحقق من HMAC هو اللي بيمنع تزوير "الدفع نجح" وهمي.

import { NextResponse } from "next/server";
import { connectToMongo } from "@/app/lib/mongodb";
import { getPaymentModel } from "@/app/lib/models";
import { verifyPaymobCallbackHmac } from "@/app/lib/paymob";
import { markPaymentSucceededAndGrantAccess, markPaymentFailed } from "@/app/lib/paymentHelpers";

function redirectFailed(origin, reason) {
  return NextResponse.redirect(`${origin}/payments/failed?reason=${encodeURIComponent(reason)}`);
}

export async function GET(request) {
  const { origin, searchParams } = new URL(request.url);

  try {
    // 🔒 أول حاجة قبل أي منطق: التحقق من التوقيع. لو فشل، مفيش داعي نكمل
    // نقرا أي قيمة تانية من الرابط أصلاً.
    const verified = verifyPaymobCallbackHmac(searchParams);
    if (!verified) {
      console.warn("[/api/payments/paymob/callback] HMAC verification failed");
      return redirectFailed(origin, "invalid_signature");
    }

    const merchantOrderId = searchParams.get("merchant_order_id");
    if (!merchantOrderId) return redirectFailed(origin, "missing_reference");

    await connectToMongo();
    const Payment = getPaymentModel();
    const payment = await Payment.findById(merchantOrderId).catch(() => null);
    if (!payment) return redirectFailed(origin, "not_found");

    // idempotent: لو الدفعة اتعالجت بالفعل (مثلاً webhook سبقنا في نفس
    // اللحظة)، نودّي المستخدم على طول لصفحة النجاح من غير أي معالجة زيادة.
    if (payment.status === "succeeded") {
      return NextResponse.redirect(`${origin}/payments/success?payment=${payment._id.toString()}`);
    }
    if (payment.status !== "pending") {
      return redirectFailed(origin, "not_completed");
    }

    const success = searchParams.get("success") === "true";
    const transactionId = searchParams.get("id");

    if (!success) {
      await markPaymentFailed(payment._id, "paymob_transaction_failed");
      return redirectFailed(origin, "not_completed");
    }

    await markPaymentSucceededAndGrantAccess(payment._id, {
      providerPaymentId: transactionId || payment.providerPaymentId,
      captureId: transactionId || null,
    });

    return NextResponse.redirect(`${origin}/payments/success?payment=${payment._id.toString()}`);
  } catch (err) {
    console.error("[/api/payments/paymob/callback] GET error:", err);
    return redirectFailed(origin, "internal_error");
  }
}
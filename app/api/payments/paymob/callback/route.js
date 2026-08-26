// app/api/payments/paymob/callback/route.js
//
// 🆕 نقطة الرجوع من Paymob بعد ما المستخدم يدفع (أو يلغي) في صفحة الدفع
// المستضافة عند Paymob (بوابة الدفع الوحيدة في المشروع بعد إلغاء PayPal).
// ده الـ "Transaction Response Callback" في إعدادات Paymob
// (Dashboard → Payment Integrations → Integration المستخدمة → Transaction
// response callback)، لازم يتظبط على:
//   https://<domain>/api/payments/paymob/callback
//
// Paymob بيرجّع هنا بـ GET query params flat (success, id, order,
// merchant_order_id, hmac, ...) — مختلف عن شكل الـ webhook (POST JSON).
//
// 🔒 مهم: الرجوع هنا مش المصدر الوحيد للحقيقة —
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
import { enforceRateLimit } from "@/app/lib/rateLimit";

function redirectFailed(origin, reason) {
  return NextResponse.redirect(`${origin}/payments/failed?reason=${encodeURIComponent(reason)}`);
}

export async function GET(request) {
  const { origin, searchParams } = new URL(request.url);

  try {
    // 🔒 SECURITY FIX (audit): نفس منطق webhook/route.js — الراوت ده بيوصله
    // المستخدم عن طريق redirect من Paymob، لكن الرابط نفسه (والـ query
    // params بتاعته) ممكن يتفتح/يتزور مباشرة من أي حد بمعدل غير محدود قبل
    // كده. الـ HMAC بيمنع "نجاح دفع" وهمي، لكن مش بيمنع استهلاك موارد
    // السيرفر (اتصال DB لكل محاولة) بمعدل عالي. حد سخي هنا برضو عشان
    // مستخدم حقيقي بيرجع من صفحة الدفع عادي أبدًا ميتأثرش.
    const rl = await enforceRateLimit(request, {
      keyPrefix: "payments:paymob:callback",
      limit: 60,
      windowSeconds: 60,
    });
    if (rl) return redirectFailed(origin, "too_many_requests");

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

    // 🔒 SECURITY (defense-in-depth): نفس فحص الـ webhook — نتأكد إن
    // amount_cents/currency الراجعين في الـ query params مطابقين للمبلغ
    // المسجل عندنا قبل ما نصدّق "الدفع نجح". حتى لو الـ HMAC اتحقق، ده حماية
    // إضافية ضد أي اختلاف غريب (bug أو تلاعب) بدل ما نمنح الوصول بصمت.
    const amountCents = searchParams.get("amount_cents");
    const currency = searchParams.get("currency");
    const amountMatches = amountCents !== null && Number(amountCents) === Number(payment.amount);
    const currencyMatches = !currency || currency === payment.currency;
    if (!amountMatches || !currencyMatches) {
      console.error("[/api/payments/paymob/callback] amount/currency mismatch — refusing to grant access", {
        paymentId: payment._id.toString(),
        expected: { amount: payment.amount, currency: payment.currency },
        received: { amount: amountCents, currency },
      });
      await markPaymentFailed(payment._id, "amount_mismatch");
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
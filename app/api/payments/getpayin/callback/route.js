// app/api/payments/getpayin/callback/route.js
//
// 🆕 نقطة الرجوع من GetPayIn بعد ما المستخدم يدفع (أو يلغي) في صفحة الدفع
// المستضافة عندهم (بوابة الدفع الوحيدة في المشروع بعد استبدال Paymob
// بالكامل). الرابط ده هو نفسه redirection_url اللي بنبنيه إحنا ونبعته لـ
// GetPayIn وقت إنشاء كل invoice (app/api/payments/checkout) — مش إعداد
// ثابت في لوحتهم زي Paymob، وده اللي بيخلينا نقدر نحط Payment._id فيه من
// البداية (?payment=<paymentId>).
//
// 🔒 مهم جدًا وبيفرق عن Paymob: GetPayIn (حسب توثيقهم الرسمي) بيوقّع
// الـ webhook بس، ومش بيوقّع query params الرجوع للمتصفح. يعني، على عكس
// verifyPaymobCallbackHmac القديمة، مفيش توقيع نقدر نتحقق منه هنا على أي
// query param جاي من GetPayIn نفسها. عشان كده إحنا:
//   1) منعتمدش خالص على أي "success=true" أو query param تاني جاي من
//      الرابط — بنستخدم بس Payment._id اللي إحنا حطيناه في الرابط أصلاً.
//   2) لو الدفعة لسه pending (يعني الـ webhook لسه ما وصلش)، بنسأل
//      GetPayIn API مباشرة (نداء server-to-server موقّع بـ hash_token
//      السري بتاعنا، checkGetPayInInvoiceStatus) عن الحالة الحقيقية قبل ما
//      نمنح أي وصول. ده أضمن فعليًا من التحقق بتاع Paymob القديم لأننا
//      بنسأل المصدر مباشرة بدل ما نصدّق حاجة راجعة في رابط.
//
// app/api/payments/getpayin/webhook (server-to-server) بيعمل نفس التأكيد
// لو المستخدم قفل التبويب قبل ما يرجع لموقعنا — الاتنين بينادوا نفس
// الدالة الآمنة markPaymentSucceededAndGrantAccess (app/lib/paymentHelpers.js).

import { NextResponse } from "next/server";
import { connectToMongo } from "@/app/lib/mongodb";
import { getPaymentModel } from "@/app/lib/models";
import { checkGetPayInInvoiceStatus } from "@/app/lib/getpayin";
import { markPaymentSucceededAndGrantAccess, markPaymentFailed } from "@/app/lib/paymentHelpers";
import { enforceRateLimit } from "@/app/lib/rateLimit";

function redirectFailed(origin, reason) {
  return NextResponse.redirect(`${origin}/payments/failed?reason=${encodeURIComponent(reason)}`);
}

export async function GET(request) {
  const { origin, searchParams } = new URL(request.url);

  try {
    // 🔒 SECURITY FIX (نفس منطق Paymob القديم): الراوت ده بيوصله المستخدم
    // عن طريق redirect من GetPayIn، لكن الرابط نفسه (والـ query params
    // بتاعته) ممكن يتفتح/يتزور مباشرة من أي حد بمعدل غير محدود قبل كده.
    // بما إننا هنا معتمدين على استعلام API حقيقي (checkGetPayInInvoiceStatus)
    // بدل توقيع في الرابط، الحد ده أهم هنا حتى من Paymob القديم — كل
    // محاولة مزوّرة بتكلّفنا نداء API خارجي كمان. حد سخي برضو عشان مستخدم
    // حقيقي بيرجع من صفحة الدفع عادي أبدًا ميتأثرش.
    const rl = await enforceRateLimit(request, {
      keyPrefix: "payments:getpayin:callback",
      limit: 60,
      windowSeconds: 60,
    });
    if (rl) return redirectFailed(origin, "too_many_requests");

    const paymentId = searchParams.get("payment");
    if (!paymentId) return redirectFailed(origin, "missing_reference");

    await connectToMongo();
    const Payment = getPaymentModel();
    const payment = await Payment.findById(paymentId).catch(() => null);
    if (!payment) return redirectFailed(origin, "not_found");

    // idempotent: لو الدفعة اتعالجت بالفعل (مثلاً webhook سبقنا في نفس
    // اللحظة)، نودّي المستخدم على طول لصفحة النجاح من غير أي معالجة زيادة.
    if (payment.status === "succeeded") {
      return NextResponse.redirect(`${origin}/payments/success?payment=${payment._id.toString()}`);
    }
    if (payment.status !== "pending") {
      return redirectFailed(origin, "not_completed");
    }
    if (!payment.providerPaymentId) {
      // مش متوقع يحصل عمليًا (بنسجل providerPaymentId فورًا بعد إنشاء
      // الـ invoice في checkout/route.js)، لكن دفاع في العمق لو حصل.
      return redirectFailed(origin, "not_completed");
    }

    // 🔒 المصدر الحقيقي هنا: نسأل GetPayIn نفسها عن حالة الـ invoice بدل
    // ما نصدّق أي query param من الرابط.
    let status;
    try {
      status = await checkGetPayInInvoiceStatus(payment.providerPaymentId);
    } catch (err) {
      console.error("[/api/payments/getpayin/callback] status check failed:", err);
      return redirectFailed(origin, "internal_error");
    }

    const paidStatus = String(status?.paidStatus || "").toUpperCase();
    if (paidStatus !== "PAID") {
      if (paidStatus === "NOT_PAID" || paidStatus === "FAILED" || paidStatus === "VOIDED") {
        await markPaymentFailed(payment._id, "getpayin_transaction_failed");
      }
      // لو لسه PENDING (بعض طرق الدفع بتاخد وقت للتأكيد)، منعملش أي إجراء
      // نهائي دلوقتي — هنستنى الـ webhook يوصل بعدين بحالة نهائية.
      return redirectFailed(origin, "not_completed");
    }

    await markPaymentSucceededAndGrantAccess(payment._id, {
      providerPaymentId: String(status.invoiceId || payment.providerPaymentId),
      captureId: status.authCode || null,
    });

    return NextResponse.redirect(`${origin}/payments/success?payment=${payment._id.toString()}`);
  } catch (err) {
    console.error("[/api/payments/getpayin/callback] GET error:", err);
    return redirectFailed(origin, "internal_error");
  }
}

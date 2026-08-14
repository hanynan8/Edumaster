// app/api/payments/webhook/route.js
//
// Phase 3 — اليوم 30: "Webhook لتأكيد الدفع (نجاح/فشل)". ده المصدر الثاني
// (والأضمن) لتأكيد الدفع غير app/api/payments/paypal/return — لازم يشتغل
// حتى لو المستخدم قفل التبويب بعد الدفع مباشرة وماوصلش لصفحة الرجوع
// بتاعتنا. اتنين مصدرين بينادوا نفس الدالة الآمنة
// markPaymentSucceededAndGrantAccess (app/lib/paymentHelpers.js) فمفيش
// تكرار في التفعيل مهما مين وصل الأول.
//
// إعداد مطلوب من PayPal Developer Dashboard:
//   Webhooks → Add Webhook → URL: https://<domain>/api/payments/webhook
//   Event types (الحد الأدنى المطلوب هنا):
//     - PAYMENT.CAPTURE.COMPLETED
//     - PAYMENT.CAPTURE.DENIED
//     - PAYMENT.CAPTURE.REFUNDED
//   بعد التسجيل، PayPal بيديك Webhook ID → يتحط في PAYPAL_WEBHOOK_ID (.env)
//
// 🔒 SECURITY: بنتحقق من توقيع كل event عن طريق PayPal نفسه
// (verifyPaypalWebhookSignature) قبل ما نصدّق أي حاجة جوه الـ body — أي حد
// يقدر يبعت POST هنا بأي بيانات، فالتحقق من التوقيع هو اللي بيمنع تزوير
// "الدفع نجح" وهمي.

import { connectToMongo } from "@/app/lib/mongodb";
import { getPaymentModel } from "@/app/lib/models";
import { verifyPaypalWebhookSignature, isPaypalConfigured } from "@/app/lib/paypal";
import {
  markPaymentSucceededAndGrantAccess,
  markPaymentFailed,
  markPaymentRefunded,
} from "@/app/lib/paymentHelpers";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// بيدوّر على الدفعة عندنا اللي الـ event ده بيخصها: أولوية لـ custom_id
// (بنحطه = Payment._id وقت إنشاء الـ order في app/api/payments/checkout)،
// وبعدين fallback على order id (providerPaymentId) لو custom_id مش موجود
// لأي سبب.
async function findPaymentForResource(resource) {
  const Payment = getPaymentModel();
  const customId = resource?.custom_id;
  if (customId) {
    const byCustomId = await Payment.findById(customId).catch(() => null);
    if (byCustomId) return byCustomId;
  }
  const orderId = resource?.supplementary_data?.related_ids?.order_id;
  if (orderId) {
    const byOrderId = await Payment.findOne({ providerPaymentId: orderId });
    if (byOrderId) return byOrderId;
  }
  return null;
}

export async function POST(request) {
  try {
    if (!isPaypalConfigured()) return jsonResponse({ received: true }, 200);

    const event = await request.json().catch(() => null);
    if (!event) return jsonResponse({ error: "invalid_payload" }, 400);

    // 🔒 التحقق من التوقيع قبل أي معالجة — لو فشل، نرفض الـ event تمامًا.
    const verified = await verifyPaypalWebhookSignature({ headers: request.headers, event });
    if (!verified) {
      console.warn("[/api/payments/webhook] signature verification failed:", event?.event_type);
      return jsonResponse({ error: "invalid_signature" }, 400);
    }

    await connectToMongo();
    const resource = event.resource || {};

    switch (event.event_type) {
      case "PAYMENT.CAPTURE.COMPLETED": {
        const payment = await findPaymentForResource(resource);
        if (payment && payment.status === "pending") {
          await markPaymentSucceededAndGrantAccess(payment._id, {
            providerPaymentId: payment.providerPaymentId,
            captureId: resource.id,
          });
        }
        break;
      }

      case "PAYMENT.CAPTURE.DENIED": {
        const payment = await findPaymentForResource(resource);
        if (payment && payment.status === "pending") {
          await markPaymentFailed(payment._id, "paypal_capture_denied");
        }
        break;
      }

      case "PAYMENT.CAPTURE.REFUNDED": {
        const payment = await findPaymentForResource(resource);
        if (payment && payment.status === "succeeded") {
          await markPaymentRefunded(payment._id);
        }
        break;
      }

      default:
        // أي event type تاني مش محتاجينه دلوقتي (مثلاً CHECKOUT.ORDER.APPROVED
        // بيتغطى أصلاً عن طريق return route) — نرجّع 200 عادي عشان PayPal
        // متعملش retry من غير داعي.
        break;
    }

    // 🔒 لازم نرجّع 200 دايمًا (حتى لو مش لاقيين الدفعة) عشان PayPal ميعملش
    // retry لا نهائي على event مش هنعالجه أصلاً؛ الأخطاء الحقيقية بتتسجل
    // بالـ console.error بس مش بترجع فشل لـ PayPal.
    return jsonResponse({ received: true }, 200);
  } catch (err) {
    console.error("[/api/payments/webhook] POST error:", err);
    // برضو نرجّع 200 عشان منضربش في retry storm — الخطأ اتسجل في اللوج.
    return jsonResponse({ received: true, error: "internal_error" }, 200);
  }
}
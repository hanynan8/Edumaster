// app/api/payments/getpayin/webhook/route.js
//
// 🆕 الـ webhook بتاع GetPayIn (بوابة الدفع الوحيدة في المشروع بعد استبدال
// Paymob بالكامل). ده المصدر الأضمن لتأكيد الدفع غير
// app/api/payments/getpayin/callback — لازم يشتغل حتى لو المستخدم قفل
// التبويب بعد الدفع مباشرة وماوصلش لصفحة الرجوع بتاعتنا. الاتنين مصدرين
// بينادوا نفس الدالة الآمنة markPaymentSucceededAndGrantAccess
// (app/lib/paymentHelpers.js) فمفيش تكرار في التفعيل مهما مين وصل الأول.
//
// الرابط ده هو نفسه اللي بنبعته لـ GetPayIn كـ webhook_url وقت إنشاء كل
// invoice في app/api/payments/checkout (مش إعداد ثابت في لوحتهم زي
// Paymob — GetPayIn بياخد الرابط ده لكل طلب على حدة).
//
// شكل الـ body اللي GetPayIn بيبعته هنا (POST JSON)، حسب SDK الرسمي:
//   { event: "invoice.paid" | "invoice.not_paid" | "invoice.voided" |
//     "invoice.refunded" | "invoice.authorized" |
//     "invoice.authorization_reversed" | ...,
//     success: 1|0, invoice_id, invoice_status, message, signature, ... }
// والتوقيع هنا جوه الـ body نفسه (payload.signature) — مختلف عن Paymob
// اللي كان بيبعت الـ hmac كـ query param منفصل.
//
// 🔒 SECURITY: بنتحقق من التوقيع (verifyGetPayInWebhookSignature) قبل ما
// نصدّق أي حاجة جوه الـ body — أي حد يقدر يبعت POST هنا بأي بيانات.

import { connectToMongo } from "@/app/lib/mongodb";
import { getPaymentModel } from "@/app/lib/models";
import { verifyGetPayInWebhookSignature } from "@/app/lib/getpayin";
import { markPaymentSucceededAndGrantAccess, markPaymentFailed, markPaymentRefunded } from "@/app/lib/paymentHelpers";
import { enforceRateLimit } from "@/app/lib/rateLimit";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// بيدوّر على الدفعة عندنا اللي الـ invoice ده بيخصها. مفيش merchant
// reference مباشر بترجع من GetPayIn زي merchant_order_id بتاع Paymob، فكل
// الاعتماد هنا على invoice_id (= Payment.providerPaymentId، اتخزن وقت
// إنشاء الـ invoice في app/api/payments/checkout).
async function findPaymentForInvoice(invoiceId) {
  if (!invoiceId) return null;
  const Payment = getPaymentModel();
  return Payment.findOne({ providerPaymentId: String(invoiceId) });
}

export async function POST(request) {
  try {
    // 🔒 SECURITY FIX (نفس منطق Paymob القديم): الراوت ده مش محمي بأي جلسة
    // (GetPayIn بينادي عليه server-to-server)، يعني أي حد على الإنترنت
    // يقدر يبعت POST هنا بأي معدل بدون قيد. التوقيع بيمنع تزوير حدث دفع،
    // لكن ده لسه بيسمح لمهاجم إنه يفتح اتصال DB (connectToMongo) ويستهلك
    // موارد السيرفر بمعدل عالي (DoS رخيص). بنحط حد سخي جدًا (يفوق أي معدل
    // حقيقي متوقع من GetPayIn نفسها بمراحل) عشان الحماية دي متأثرش على
    // استقبال أحداث الدفع الحقيقية مهما زادت، وتوقف بس السبام الواضح.
    const rl = await enforceRateLimit(request, {
      keyPrefix: "payments:getpayin:webhook",
      limit: 60,
      windowSeconds: 60,
    });
    if (rl) return rl;

    const payload = await request.json().catch(() => null);
    if (!payload || !payload.event || payload.invoice_id === undefined) {
      return jsonResponse({ error: "invalid_payload" }, 400);
    }

    // 🔒 التحقق من التوقيع قبل أي معالجة — لو فشل، نرفض الـ event تمامًا.
    if (!verifyGetPayInWebhookSignature(payload)) {
      console.warn("[/api/payments/getpayin/webhook] signature verification failed");
      return jsonResponse({ error: "invalid_signature" }, 400);
    }

    await connectToMongo();

    const payment = await findPaymentForInvoice(payload.invoice_id);
    if (payment && payment.status === "pending") {
      switch (payload.event) {
        case "invoice.paid":
          await markPaymentSucceededAndGrantAccess(payment._id, {
            providerPaymentId: String(payload.invoice_id),
            captureId: payload.auth_code ? String(payload.auth_code) : null,
          });
          break;
        case "invoice.not_paid":
        case "invoice.voided":
        case "invoice.authorization_reversed":
          await markPaymentFailed(payment._id, `getpayin_${payload.event.replace(/\./g, "_")}`);
          break;
        case "invoice.authorized":
          // 🆕 وضع "authorize" بس (من غير capture فوري) — المشروع بيستخدم
          // capture الافتراضي دايمًا (مبنبعتش payment_mode في invoices.create)
          // فالحالة دي عمليًا مش متوقعة تحصل، لكن لو حصلت مننفذش أي حاجة
          // دلوقتي: لسه مش "مدفوع فعليًا" (paid) — هنستنى invoice.paid أو
          // invoice.not_paid بعدها.
          break;
        case "invoice.refunded":
          await markPaymentRefunded(payment._id);
          break;
        default:
          // أنواع أحداث تانية (subscription.*, installment.*, vcc.*,
          // card_token.*) مش متعلقة بتدفق invoice المفرد اللي المشروع
          // بيستخدمه هنا — بنتجاهلها بأمان.
          break;
      }
    }

    // 🔒 لازم نرجّع 200 دايمًا (حتى لو مش لاقيين الدفعة) عشان GetPayIn
    // ميعملش retry من غير داعي؛ الأخطاء الحقيقية بتتسجل بالـ console.error
    // بس مش بترجع فشل لـ GetPayIn.
    return jsonResponse({ received: true }, 200);
  } catch (err) {
    console.error("[/api/payments/getpayin/webhook] POST error:", err);
    return jsonResponse({ received: true, error: "internal_error" }, 200);
  }
}

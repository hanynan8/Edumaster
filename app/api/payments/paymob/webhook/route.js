// app/api/payments/paymob/webhook/route.js
//
// 🆕 "Transaction Processed Callback" بتاع Paymob (بوابة الدفع الوحيدة في
// المشروع بعد إلغاء PayPal نهائيًا). ده المصدر الثاني (والأضمن) لتأكيد
// الدفع غير app/api/payments/paymob/callback — لازم يشتغل حتى لو المستخدم
// قفل التبويب بعد الدفع مباشرة وماوصلش لصفحة الرجوع بتاعتنا. الاتنين
// مصدرين بينادوا نفس الدالة الآمنة
// markPaymentSucceededAndGrantAccess (app/lib/paymentHelpers.js) فمفيش
// تكرار في التفعيل مهما مين وصل الأول.
//
// إعداد مطلوب من Paymob Dashboard → Payment Integrations → Integration
// المستخدمة → Transaction processed callback:
//   https://<domain>/api/payments/paymob/webhook
//
// شكل الـ body اللي Paymob بيبعته هنا (POST JSON):
//   { type: "TRANSACTION", obj: { id, success, pending, amount_cents,
//     order: { id, merchant_order_id, ... }, source_data: {...}, ... } }
// والـ hmac بيوصل كـ query param في نفس رابط الـ webhook (؟hmac=...)، مش
// جوه الـ body — Paymob بيحسبه من حقول obj.
//
// 🔒 SECURITY: بنتحقق من الـ HMAC (verifyPaymobWebhookHmac) قبل ما نصدّق
// أي حاجة جوه الـ body — أي حد يقدر يبعت POST هنا بأي بيانات.

import { connectToMongo } from "@/app/lib/mongodb";
import { getPaymentModel } from "@/app/lib/models";
import { verifyPaymobWebhookHmac } from "@/app/lib/paymob";
import { markPaymentSucceededAndGrantAccess, markPaymentFailed } from "@/app/lib/paymentHelpers";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// بيدوّر على الدفعة عندنا اللي الـ transaction ده بيخصها: أولوية لـ
// merchant_order_id (بنحطه = Payment._id وقت إنشاء الـ order في
// app/api/payments/checkout)، وبعدين fallback على order id
// (providerPaymentId) لو merchant_order_id مش موجود لأي سبب.
async function findPaymentForTransaction(obj) {
  const Payment = getPaymentModel();
  const merchantOrderId = obj?.order?.merchant_order_id;
  if (merchantOrderId) {
    const byMerchantOrderId = await Payment.findById(merchantOrderId).catch(() => null);
    if (byMerchantOrderId) return byMerchantOrderId;
  }
  const paymobOrderId = obj?.order?.id;
  if (paymobOrderId) {
    const byOrderId = await Payment.findOne({ providerPaymentId: String(paymobOrderId) });
    if (byOrderId) return byOrderId;
  }
  return null;
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hmacFromQuery = searchParams.get("hmac");

    const payload = await request.json().catch(() => null);
    if (!payload || payload.type !== "TRANSACTION" || !payload.obj) {
      return jsonResponse({ error: "invalid_payload" }, 400);
    }

    const transactionObj = payload.obj;

    // 🔒 التحقق من التوقيع قبل أي معالجة — لو فشل، نرفض الـ event تمامًا.
    const verified = verifyPaymobWebhookHmac({ transactionObj, hmacFromQuery });
    if (!verified) {
      console.warn("[/api/payments/paymob/webhook] HMAC verification failed");
      return jsonResponse({ error: "invalid_signature" }, 400);
    }

    await connectToMongo();

    const payment = await findPaymentForTransaction(transactionObj);
    if (payment && payment.status === "pending") {
      // 🔒 SECURITY (defense-in-depth): حتى لو الـ HMAC اتحقق، بنتأكد كمان إن
      // amount_cents/currency الراجعين من Paymob في الـ transaction فعلاً
      // مطابقين للمبلغ والعملة اللي اتسجلوا عندنا وقت فتح الـ checkout
      // (payment.amount/payment.currency). المفروض ميحصلش اختلاف أبدًا في
      // الحالة الطبيعية (المبلغ ده هو نفسه اللي بعتناه لـ Paymob وقت إنشاء
      // الـ order/payment key)، فلو حصل اختلاف يبقى فيه حاجة غريبة (bug أو
      // محاولة تلاعب) ولازم نوقف التفعيل ونحقق بدل ما نصدّق بصمت.
      const amountMatches = Number(transactionObj.amount_cents) === Number(payment.amount);
      const currencyMatches =
        !transactionObj.currency || transactionObj.currency === payment.currency;

      if (transactionObj.success && !transactionObj.pending) {
        if (!amountMatches || !currencyMatches) {
          console.error(
            "[/api/payments/paymob/webhook] amount/currency mismatch — refusing to grant access",
            {
              paymentId: payment._id.toString(),
              expected: { amount: payment.amount, currency: payment.currency },
              received: { amount: transactionObj.amount_cents, currency: transactionObj.currency },
            }
          );
          await markPaymentFailed(payment._id, "amount_mismatch");
          return jsonResponse({ received: true }, 200);
        }
        await markPaymentSucceededAndGrantAccess(payment._id, {
          providerPaymentId: String(transactionObj.order?.id ?? payment.providerPaymentId),
          captureId: transactionObj.id ? String(transactionObj.id) : null,
        });
      } else if (!transactionObj.success && !transactionObj.pending) {
        await markPaymentFailed(payment._id, "paymob_transaction_failed");
      }
      // لو pending=true (لسه في انتظار تأكيد نهائي، مثلاً بعض محافظ
      // الموبايل)، ماناخدش أي إجراء دلوقتي — هنستنى event تاني بـ
      // pending=false.
    }

    // 🔒 لازم نرجّع 200 دايمًا (حتى لو مش لاقيين الدفعة) عشان Paymob
    // ميعملش retry من غير داعي؛ الأخطاء الحقيقية بتتسجل بالـ console.error
    // بس مش بترجع فشل لـ Paymob.
    return jsonResponse({ received: true }, 200);
  } catch (err) {
    console.error("[/api/payments/paymob/webhook] POST error:", err);
    return jsonResponse({ received: true, error: "internal_error" }, 200);
  }
}
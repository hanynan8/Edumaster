// app/api/payments/getpayin/consultation-checkout/route.js
//
// 🆕 بداية عملية دفع GetPayIn لطلب استشارة (ConsultationForm) — نسخة عامة
// (من غير تسجيل دخول) من app/api/payments/checkout، لأن طلب الاستشارة نفسه
// بيتبعت من غير session أصلاً (زي فورم التواصل "form"، شوف
// app/api/data/route.js → PUBLIC_WRITE_COLLECTIONS). المستخدم بيبعت هنا
// الـ consultationId اللي رجعله من POST /api/data?collection=consultations
// بعد ما الفورم يتسجل بنجاح، ولغة الموقع الحالية عنده.
//
// الرسوم ثابتة عند 1300 جنيه مصري (نفس CONSULTATION_FEE في
// ConsultationForm.jsx) ومحوّلة تلقائيًا للعملة المناسبة حسب لغة الموقع
// (ar→EGP, en→USD, es→EUR) بنفس منطق app/lib/currency.js المستخدم في باقي
// المشروع — مفيش دخل هنا لأي مبلغ جاي من الـ client، العملة والمبلغ
// بيتحسبوا في السيرفر بس عشان محدّش يقدر يغيّر السعر من الـ request.
//
// POST body: { consultationId: "<id>", language?: "ar" | "en" | "es" }
//
// 🔒 الراوت ده عام (زي POST /api/data?collection=consultations نفسه) —
// rate limiting بالـ IP هنا (مفيش user session نربط بيه زي checkout/route.js
// العادي) عشان نمنع سبام يفتح invoices فاضية بلا حدود.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getPaymentModel } from "@/app/lib/models";
import {
  createGetPayInInvoice,
  isGetPayInConfigured,
  amountCentsToDecimalString,
} from "@/app/lib/getpayin";
import { getCurrencyForLanguage, convertPrice } from "@/app/lib/currency";
import { enforceRateLimit } from "@/app/lib/rateLimit";

// نفس رسوم الاستشارة الثابتة في app/components/consultation/ConsultationForm.jsx
const CONSULTATION_FEE_EGP = 1300;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  try {
    const rl = await enforceRateLimit(request, {
      keyPrefix: "payments:consultation-checkout",
      limit: 10,
      windowSeconds: 60,
    });
    if (rl) return rl;

    if (!isGetPayInConfigured()) {
      return jsonResponse({ error: "payment_gateway_not_configured" }, 503);
    }

    const body = await request.json().catch(() => null);
    const consultationId = body?.consultationId;
    const language = ["ar", "en", "es"].includes(body?.language) ? body.language : "ar";

    if (!mongoose.Types.ObjectId.isValid(consultationId)) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    await connectToMongo();

    // 🆕 كولكشن "consultations" عام بسكيمة مرنة (مفيش موديل mongoose ثابت
    // ليه، شوف app/api/data/route.js) — بنقرأه مباشرة عن طريق الـ driver.
    const consultationsCol = mongoose.connection.db.collection("consultations");
    const consultationObjectId = new mongoose.Types.ObjectId(consultationId);
    const consultation = await consultationsCol.findOne({ _id: consultationObjectId });
    if (!consultation) return jsonResponse({ error: "not_found" }, 404);

    const Payment = getPaymentModel();

    // 🔒 منع فتح invoice تاني لو الاستشارة دي أصلاً اتدفعت بنجاح قبل كده.
    const alreadyPaid = await Payment.findOne({
      consultation: consultationObjectId,
      status: "succeeded",
    }).lean();
    if (alreadyPaid) return jsonResponse({ error: "already_paid" }, 409);

    const currency = getCurrencyForLanguage(language);
    const amount = convertPrice(CONSULTATION_FEE_EGP, "EGP", currency);
    if (!amount || amount <= 0) return jsonResponse({ error: "invalid_amount" }, 400);
    const amountCents = Math.round(amount * 100); // نفس وحدة Payment.amount (قروش/سنت)

    const fullName = [consultation.firstName, consultation.lastName].filter(Boolean).join(" ").trim();

    const payment = await Payment.create({
      user: null,
      type: "consultation",
      consultation: consultationObjectId,
      guestName: fullName || null,
      guestEmail: consultation.email || null,
      amount: amountCents,
      currency,
      status: "pending",
      provider: "getpayin",
      metadata: { consultationId: consultationId },
    });

    const origin = (process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/+$/, "");
    // 🆕 بنستخدم نفس callback/webhook العامّين المستخدمين لـ course/membership
    // (مش بيفرّقوا في المنطق حسب type، شوف app/api/payments/getpayin/callback
    // و app/api/payments/getpayin/webhook) — نفس الربط بـ Payment._id.
    const redirectionUrl = `${origin}/api/payments/getpayin/callback?payment=${payment._id.toString()}`;
    const webhookUrl = `${origin}/api/payments/getpayin/webhook`;
    const description = `Consultation: ${fullName || consultation.email || "Edumaster365"}`.slice(0, 120);

    const [firstName, ...rest] = (fullName || "NA NA").split(" ");

    let invoice;
    try {
      invoice = await createGetPayInInvoice({
        amount: amountCentsToDecimalString(amountCents),
        currency,
        firstName: consultation.firstName || firstName || "NA",
        lastName: consultation.lastName || rest.join(" ") || "NA",
        email: consultation.email,
        orderTitle: description,
        orderDetails: description,
        redirectionUrl,
        webhookUrl,
      });
    } catch (err) {
      console.error("[/api/payments/getpayin/consultation-checkout] GetPayIn invoice creation failed:", err);
      payment.status = "failed";
      payment.metadata = { ...payment.metadata, failureReason: "getpayin_invoice_creation_failed" };
      await payment.save();
      return jsonResponse({ error: "getpayin_error" }, 502);
    }

    payment.providerPaymentId = String(invoice.invoiceId);
    await payment.save();

    return jsonResponse(
      {
        paymentId: payment._id.toString(),
        invoiceId: invoice.invoiceId,
        redirectUrl: invoice.checkoutUrl,
      },
      201
    );
  } catch (err) {
    console.error("[/api/payments/getpayin/consultation-checkout] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
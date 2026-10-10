// app/api/payments/getpayin/placement-test-checkout/route.js
//
// بداية دفع GetPayIn لرسوم استلام نتيجة اختبار تحديد المستوى (إسباني) —
// نسخة مطابقة لـ consultation-checkout (دفع ضيف من غير تسجيل دخول). نفس
// callback/webhook العامّين، ونفس نظام الدفع بتاع الكورسات بالظبط.
//
// الرسوم 5$ (PLACEMENT_TEST_FEE_USD) ومحوّلة لعملة لغة الموقع (ar→EGP,
// en→USD, es→EUR). المبلغ والعملة بيتحسبوا هنا في السيرفر بس.
//
// POST body: { testId: "<id>", language?: "ar" | "en" | "es" }

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getPaymentModel } from "@/app/lib/models";
import {
  createGetPayInInvoice,
  isGetPayInConfigured,
  amountCentsToDecimalString,
} from "@/app/lib/getpayin";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import { getPlacementTestsCollection, getPlacementTestFee } from "@/app/lib/placementTest";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  try {
    const rl = await enforceRateLimit(request, {
      keyPrefix: "payments:placement-test-checkout",
      limit: 10,
      windowSeconds: 60,
    });
    if (rl) return rl;

    if (!isGetPayInConfigured()) {
      return jsonResponse({ error: "payment_gateway_not_configured" }, 503);
    }

    const body = await request.json().catch(() => null);
    const testId = body?.testId;
    const language = ["ar", "en", "es"].includes(body?.language) ? body.language : "ar";
    if (!mongoose.Types.ObjectId.isValid(testId)) return jsonResponse({ error: "invalid_request" }, 400);

    await connectToMongo();
    const testObjectId = new mongoose.Types.ObjectId(testId);
    const test = await getPlacementTestsCollection().findOne({ _id: testObjectId });
    if (!test) return jsonResponse({ error: "not_found" }, 404);

    const Payment = getPaymentModel();
    const alreadyPaid = await Payment.findOne({ placementTest: testObjectId, status: "succeeded" }).lean();
    if (alreadyPaid) return jsonResponse({ error: "already_paid" }, 409);

    const { currency, amount } = getPlacementTestFee(language);
    if (!amount || amount <= 0) return jsonResponse({ error: "invalid_amount" }, 400);
    const amountCents = Math.round(amount * 100);

    const payment = await Payment.create({
      user: null,
      type: "placement_test",
      placementTest: testObjectId,
      guestName: test.name || null,
      guestEmail: test.email || null,
      amount: amountCents,
      currency,
      status: "pending",
      provider: "getpayin",
      metadata: { placementTestId: testId },
    });

    const origin = (process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/+$/, "");
    const redirectionUrl = `${origin}/api/payments/getpayin/callback?payment=${payment._id.toString()}`;
    const webhookUrl = `${origin}/api/payments/getpayin/webhook`;
    const description = `Spanish level test: ${test.name || "Edumaster365"}`.slice(0, 120);
    const [firstName, ...rest] = String(test.name || "NA NA").trim().split(" ");

    let invoice;
    try {
      invoice = await createGetPayInInvoice({
        amount: amountCentsToDecimalString(amountCents),
        currency,
        firstName: firstName || "NA",
        lastName: rest.join(" ") || "NA",
        email: test.email,
        orderTitle: description,
        orderDetails: description,
        redirectionUrl,
        webhookUrl,
      });
    } catch (err) {
      console.error("[/api/payments/getpayin/placement-test-checkout] invoice creation failed:", err);
      payment.status = "failed";
      payment.metadata = { ...payment.metadata, failureReason: "getpayin_invoice_creation_failed" };
      await payment.save();
      return jsonResponse({ error: "getpayin_error" }, 502);
    }

    payment.providerPaymentId = String(invoice.invoiceId);
    await payment.save();

    return jsonResponse(
      { paymentId: payment._id.toString(), invoiceId: invoice.invoiceId, redirectUrl: invoice.checkoutUrl },
      201
    );
  } catch (err) {
    console.error("[/api/payments/getpayin/placement-test-checkout] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

// app/api/payments/checkout/route.js
//
// Phase 3 — اليوم 27-29: بداية أي عملية دفع (شراء كورس مفرد أو اشتراك
// membership مدفوع، شهري أو سنوي). الراوت بيتحقق الأول إن المنتج
// (كورس/خطة) فعلاً محتاج دفع ومتاح، يعمل سجل Payment بحالة "pending"،
// بعدين يفتح عملية دفع عند Paymob ويرجّع للـ client رابط التحويل
// (redirectUrl) عشان يوديه لصفحة الدفع يدفع فيها.
//
// 🆕 اعتماد كلي على Paymob (PayPal اتشال نهائيًا من المشروع). العملة بقت
// ديناميكية حسب لغة الموقع الحالية عند المستخدم وقت الدفع — مش حسب أي
// إعداد ثابت في السيرفر. الـ client لازم يبعت "language" في الـ body
// (شوف app/lib/currency.js لخريطة لغة→عملة الكاملة):
//
// POST body: { type: "course" | "membership", id: "<courseId أو planId>", language?: "ar" | "en" | "es" }
//
// لو الـ client مبعتش language (client قديم أو خطأ)، بنقع افتراضيًا على
// "ar" → EGP، وهو نفس افتراض لغة الموقع في باقي المشروع.
//
// 🔒 التفعيل الفعلي (Enrollment أو تفعيل membership) بيحصل *بعد كده* في
// app/api/payments/paymob/callback أو app/api/payments/paymob/webhook —
// مش هنا، ومش قبل ما Paymob تأكد الدفع فعليًا. ده بالظبط اللي تعليق
// Payment.js بيقصده بـ "مصدر الحقيقة المالي".

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getMembershipPlanModel, getPaymentModel } from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";
import { getCourseAccessForUser } from "@/app/lib/access";
import {
  createPaymobOrder,
  createPaymobPaymentKey,
  buildPaymobIframeUrl,
  isPaymobConfigured,
  isCurrencySupported,
  getIntegrationIdForCurrency,
} from "@/app/lib/paymob";
import { getPriceForCurrency } from "@/app/lib/currency";
import { enforceRateLimit } from "@/app/lib/rateLimit";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    // 🔒 SECURITY (Day 59): كل نداء هنا بيفتح Paymob Order (نداءين خارجيين
    // مكلفين ماليًا وزمنيًا) — 10 محاولات/دقيقة لكل مستخدم كافية لأي استخدام
    // حقيقي ومنع أي محاولة سبام تفتح مئات الـ orders الفاضية.
    const rl = await enforceRateLimit(request, {
      keyPrefix: "payments:checkout",
      limit: 10,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    if (!isPaymobConfigured()) {
      return jsonResponse({ error: "payment_gateway_not_configured" }, 503);
    }

    const body = await request.json().catch(() => null);
    const type = body?.type;
    const targetId = body?.id;
    // 🆕 لغة الموقع الحالية عند المستخدم — بتحدد العملة (شوف app/lib/currency.js)
    const language = ["ar", "en", "es"].includes(body?.language) ? body.language : "ar";
    if (!["course", "membership"].includes(type) || !mongoose.Types.ObjectId.isValid(targetId)) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    await connectToMongo();
    const Payment = getPaymentModel();

    let amount;
    let currency;
    let description;
    let courseRef = null;
    let membershipPlanRef = null;
    const metadata = {};

    if (type === "course") {
      const Course = getCourseModel();
      const course = await Course.findById(targetId).lean();
      if (!course || course.status !== "published") return jsonResponse({ error: "not_found" }, 404);

      const priceInfo = getPriceForCurrency(course.prices, language);
      if (course.isFree || priceInfo.amount <= 0) {
        return jsonResponse({ error: "course_is_free" }, 400);
      }
      // 🔒 نفس فحص app/api/enrollments: المدرس صاحب الكورس ميقدرش "يشتري" كورسه هو
      if (String(course.teacher) === String(session.user.id)) {
        return jsonResponse({ error: "cannot_enroll_own_course" }, 409);
      }
      // مفيش داعي نفتح checkout جديد لو أصلاً عنده وصول (enrollment أو membership تغطيه)
      const access = await getCourseAccessForUser({ userId: session.user.id, courseId: targetId });
      if (access.hasAccess) return jsonResponse({ error: "already_have_access" }, 409);

      amount = Math.round(priceInfo.amount * 100); // 🩹 FIX: course.prices مبالغ كاملة (جنيه/دولار/يورو) — لازم تتحول لقروش/سنت هنا (وحدة Payment.amount/Paymob amount_cents)، وإلا هيتحصّل 1% بس من السعر الفعلي.
      currency = priceInfo.currency;
      description = `Course: ${course.title}`.slice(0, 120);
      courseRef = course._id;
    } else {
      const MembershipPlan = getMembershipPlanModel();
      const plan = await MembershipPlan.findById(targetId).lean();
      if (!plan || !plan.isActive) return jsonResponse({ error: "not_found" }, 404);

      const priceInfo = getPriceForCurrency(plan.prices, language);
      if (plan.billingCycle === "free" || priceInfo.amount <= 0) {
        return jsonResponse({ error: "plan_is_free" }, 400);
      }

      amount = Math.round(priceInfo.amount * 100); // 🩹 FIX: نفس تحويل الكورس فوق — plan.prices مبالغ كاملة، لازم قروش/سنت هنا.
      currency = priceInfo.currency;
      description = `Membership: ${plan.name}`.slice(0, 120);
      membershipPlanRef = plan._id;
      metadata.billingCycle = plan.billingCycle;
    }

    // 🩹 BUG FIX (audit): قبل كده كنا بنكتشف إن العملة مش مدعومة بس لما
    // Paymob ترفض الطلب بـ "Invalid currency sent" (بعد ما نكون عملنا
    // Payment بحالة pending واتصلنا بـ Paymob مرتين). دلوقتي بنتأكد الأول
    // إن فيه integration فعلي متظبط للعملة دي، وبنرجّع رسالة واضحة بدل
    // خطأ عام لو مش متاحة — مفيش Payment وهمية بتتعمل ومفيش نداء API
    // ضايع لـ Paymob لو أصلاً هيفشل.
    if (!isCurrencySupported(currency)) {
      console.error(
        `[/api/payments/checkout] No Paymob integration configured for currency "${currency}"`
      );
      return jsonResponse(
        { error: "currency_not_available", currency },
        503
      );
    }

    const payment = await Payment.create({
      user: session.user.id,
      type,
      course: courseRef,
      membershipPlan: membershipPlanRef,
      amount,
      currency,
      status: "pending",
      provider: "paymob",
      metadata,
    });

    return await startPaymobCheckout({ payment, amount, currency, session, metadata });
  } catch (err) {
    console.error("[/api/payments/checkout] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

// تدفق Paymob: order registration بعدها payment key، وبعدين رابط الـ
// iframe المستضافة عند Paymob هو الـ redirectUrl اللي بنرجّعه للـ client
// (window.location.href كامل، مفيش iframe مضمّن في صفحتنا احنا).
async function startPaymobCheckout({ payment, amount, currency, session, metadata }) {
  let paymobOrder;
  try {
    paymobOrder = await createPaymobOrder({
      amount,
      currency,
      merchantOrderId: payment._id.toString(),
    });
  } catch (err) {
    console.error("[/api/payments/checkout] Paymob order creation failed:", err);
    payment.status = "failed";
    payment.metadata = { ...metadata, failureReason: "paymob_order_creation_failed" };
    await payment.save();
    return jsonResponse({ error: "paymob_error" }, 502);
  }

  let paymentKey;
  try {
    const [firstName, ...rest] = (session.user.name || "NA NA").trim().split(" ");
    paymentKey = await createPaymobPaymentKey({
      amount,
      currency,
      orderId: paymobOrder.id,
      // 🩹 BUG FIX (audit): integration_id الصح لعملة الدفعة دي بالذات —
      // ده كان بيتقرا قبل كده من متغير بيئة واحد ثابت جوه paymob.js نفسه
      // (PAYMOB_INTEGRATION_ID)، فأي عملة غير اللي الـ integration ده
      // متسجل بيها في Paymob كانت بترجع "Invalid currency sent".
      integrationId: getIntegrationIdForCurrency(currency),
      billingData: {
        firstName: firstName || "NA",
        lastName: rest.join(" ") || "NA",
        email: session.user.email,
        phone: session.user.phone,
      },
    });
  } catch (err) {
    console.error("[/api/payments/checkout] Paymob payment key request failed:", err);
    payment.status = "failed";
    payment.metadata = { ...metadata, failureReason: "paymob_payment_key_failed" };
    await payment.save();
    return jsonResponse({ error: "paymob_error" }, 502);
  }

  // providerPaymentId بيتخزن هنا order id بتاع Paymob (رقم) — بنستخدمه
  // كـ fallback lookup في الـ webhook/callback؛ الاعتماد الأساسي بيبقى على
  // merchant_order_id (= payment._id).
  payment.providerPaymentId = String(paymobOrder.id);
  await payment.save();

  return jsonResponse(
    {
      paymentId: payment._id.toString(),
      orderId: paymobOrder.id,
      redirectUrl: buildPaymobIframeUrl(paymentKey.token),
    },
    201
  );
}
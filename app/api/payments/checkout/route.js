// app/api/payments/checkout/route.js
//
// Phase 3 — اليوم 27-29: بداية أي عملية دفع (شراء كورس مفرد أو اشتراك
// membership مدفوع، شهري أو سنوي). الراوت بيتحقق الأول إن المنتج
// (كورس/خطة) فعلاً محتاج دفع ومتاح، يعمل سجل Payment بحالة "pending"،
// بعدين يفتح عملية دفع عند بوابة الدفع المختارة ويرجّع للـ client رابط
// التحويل (redirectUrl) عشان يوديه لصفحة الدفع يدفع فيها.
//
// 🆕 بوابتين متاحين دلوقتي جنب بعض: PayPal (app/lib/paypal.js) و Paymob
// (app/lib/paymob.js) — الـ client بيحدد أي واحد عايز يستخدم عن طريق
// "provider" في الـ body؛ لو متبعتش، PayPal هي الافتراضية (backward
// compatible مع أي client قديم لسه بيبعت من غير provider).
//
// 🔒 التفعيل الفعلي (Enrollment أو تفعيل membership) بيحصل *بعد كده* في
// app/api/payments/paypal/return أو app/api/payments/paymob/callback أو
// أي من الـ webhook routes بتاعتهم — مش هنا، ومش قبل ما بوابة الدفع تأكد
// الدفع فعليًا. ده بالظبط اللي تعليق Payment.js بيقصده بـ "مصدر الحقيقة
// المالي".
//
// POST body: { type: "course" | "membership", id: "<courseId أو planId>", provider?: "paypal" | "paymob" }

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getMembershipPlanModel, getPaymentModel } from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";
import { getCourseAccessForUser } from "@/app/lib/access";
import { createPaypalOrder, isPaypalConfigured } from "@/app/lib/paypal";
import {
  createPaymobOrder,
  createPaymobPaymentKey,
  buildPaymobIframeUrl,
  isPaymobConfigured,
} from "@/app/lib/paymob";
import { enforceRateLimit } from "@/app/lib/rateLimit";

const PROVIDERS = ["paypal", "paymob"];

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

    // 🔒 SECURITY (Day 59): كل نداء هنا بيفتح PayPal Order (نداء خارجي مكلف
    // ماليًا وزمنيًا) — 10 محاولات/دقيقة لكل مستخدم كافية لأي استخدام حقيقي
    // ومنع أي محاولة سبام تفتح مئات الـ orders الفاضية.
    const rl = await enforceRateLimit(request, {
      keyPrefix: "payments:checkout",
      limit: 10,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    const body = await request.json().catch(() => null);
    const type = body?.type;
    const targetId = body?.id;
    // 🆕 provider اختياري — PayPal افتراضيًا لو الـ client مبعتوش (توافق مع
    // أي نداء قديم من قبل ما Paymob اتضاف).
    const provider = PROVIDERS.includes(body?.provider) ? body.provider : "paypal";
    if (!["course", "membership"].includes(type) || !mongoose.Types.ObjectId.isValid(targetId)) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    if (provider === "paypal" && !isPaypalConfigured()) {
      return jsonResponse({ error: "payment_gateway_not_configured" }, 503);
    }
    if (provider === "paymob" && !isPaymobConfigured()) {
      return jsonResponse({ error: "payment_gateway_not_configured" }, 503);
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
      if (course.isFree || !course.price || course.price <= 0) {
        return jsonResponse({ error: "course_is_free" }, 400);
      }
      // 🔒 نفس فحص app/api/enrollments: المدرس صاحب الكورس ميقدرش "يشتري" كورسه هو
      if (String(course.teacher) === String(session.user.id)) {
        return jsonResponse({ error: "cannot_enroll_own_course" }, 409);
      }
      // مفيش داعي نفتح checkout جديد لو أصلاً عنده وصول (enrollment أو membership تغطيه)
      const access = await getCourseAccessForUser({ userId: session.user.id, courseId: targetId });
      if (access.hasAccess) return jsonResponse({ error: "already_have_access" }, 409);

      amount = course.price;
      currency = course.currency || "EGP";
      description = `Course: ${course.title}`.slice(0, 120);
      courseRef = course._id;
    } else {
      const MembershipPlan = getMembershipPlanModel();
      const plan = await MembershipPlan.findById(targetId).lean();
      if (!plan || !plan.isActive) return jsonResponse({ error: "not_found" }, 404);
      if (plan.billingCycle === "free" || !plan.price || plan.price <= 0) {
        return jsonResponse({ error: "plan_is_free" }, 400);
      }

      amount = plan.price;
      currency = plan.currency || "EGP";
      description = `Membership: ${plan.name}`.slice(0, 120);
      membershipPlanRef = plan._id;
      metadata.billingCycle = plan.billingCycle;
    }

    const payment = await Payment.create({
      user: session.user.id,
      type,
      course: courseRef,
      membershipPlan: membershipPlanRef,
      amount,
      currency,
      status: "pending",
      provider,
      metadata,
    });

    const origin = new URL(request.url).origin;

    if (provider === "paypal") {
      return await startPaypalCheckout({ payment, amount, currency, description, origin, metadata });
    }
    return await startPaymobCheckout({ payment, amount, session, metadata });
  } catch (err) {
    console.error("[/api/payments/checkout] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

async function startPaypalCheckout({ payment, amount, currency, description, origin, metadata }) {
  let order;
  try {
    order = await createPaypalOrder({
      amount,
      currency,
      referenceId: payment._id.toString(),
      description,
      returnUrl: `${origin}/api/payments/paypal/return`,
      cancelUrl: `${origin}/api/payments/paypal/return?cancelled=1`,
    });
  } catch (err) {
    console.error("[/api/payments/checkout] PayPal order creation failed:", err);
    payment.status = "failed";
    payment.metadata = { ...metadata, failureReason: "paypal_order_creation_failed" };
    await payment.save();
    return jsonResponse({ error: "paypal_error" }, 502);
  }

  payment.providerPaymentId = order.id;
  await payment.save();

  const approveLink = (order.links || []).find((l) => l.rel === "approve" || l.rel === "payer-action");
  if (!approveLink) {
    console.error("[/api/payments/checkout] PayPal order has no approve link:", order);
    return jsonResponse({ error: "paypal_error" }, 502);
  }

  return jsonResponse(
    { paymentId: payment._id.toString(), orderId: order.id, redirectUrl: approveLink.href },
    201
  );
}

// 🆕 تدفق Paymob: order registration بعدها payment key، وبعدين رابط الـ
// iframe المستضافة عند Paymob هو الـ redirectUrl اللي بنرجّعه للـ client
// (نفس شكل approveUrl بتاع PayPal، redirect كامل بـ window.location.href).
async function startPaymobCheckout({ payment, amount, session, metadata }) {
  let paymobOrder;
  try {
    paymobOrder = await createPaymobOrder({
      amount,
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
      orderId: paymobOrder.id,
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

  // providerPaymentId بيتخزن هنا order id بتاع Paymob (رقم، مش الـ payment
  // token) — بنستخدمه كـ fallback lookup في الـ webhook/callback زي orderId
  // في PayPal؛ الاعتماد الأساسي بيبقى على merchant_order_id (= payment._id).
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
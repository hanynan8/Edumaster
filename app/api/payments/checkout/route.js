// app/api/payments/checkout/route.js
//
// Phase 3 — اليوم 27-29: بداية أي عملية دفع (شراء كورس مفرد أو اشتراك
// membership مدفوع، شهري أو سنوي) عن طريق PayPal. الراوت بيتحقق الأول إن
// المنتج (كورس/خطة) فعلاً محتاج دفع ومتاح، يعمل سجل Payment بحالة
// "pending"، بعدين يفتح PayPal Order ويرجّع للـ client رابط الموافقة
// (approveUrl) عشان يوديه لصفحة PayPal يدفع فيها.
//
// 🔒 التفعيل الفعلي (Enrollment أو تفعيل membership) بيحصل *بعد كده* في
// app/api/payments/paypal/return أو app/api/payments/webhook — مش هنا،
// ومش قبل ما PayPal يأكد الدفع فعليًا (capture ناجح). ده بالظبط اللي
// تعليق Payment.js بيقصده بـ "مصدر الحقيقة المالي".
//
// POST body: { type: "course" | "membership", id: "<courseId أو planId>" }

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getMembershipPlanModel, getPaymentModel } from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";
import { getCourseAccessForUser } from "@/app/lib/access";
import { createPaypalOrder, isPaypalConfigured } from "@/app/lib/paypal";
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

    if (!isPaypalConfigured()) {
      return jsonResponse({ error: "payment_gateway_not_configured" }, 503);
    }

    const body = await request.json().catch(() => null);
    const type = body?.type;
    const targetId = body?.id;
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
      provider: "paypal",
      metadata,
    });

    const origin = new URL(request.url).origin;
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
      { paymentId: payment._id.toString(), orderId: order.id, approveUrl: approveLink.href },
      201
    );
  } catch (err) {
    console.error("[/api/payments/checkout] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
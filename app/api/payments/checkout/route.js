// app/api/payments/checkout/route.js
//
// Phase 3 — اليوم 27-29: بداية أي عملية دفع (شراء كورس مفرد أو اشتراك
// membership مدفوع، شهري أو سنوي). الراوت بيتحقق الأول إن المنتج
// (كورس/خطة) فعلاً محتاج دفع ومتاح، يعمل سجل Payment بحالة "pending"،
// بعدين يفتح عملية دفع عند GetPayIn ويرجّع للـ client رابط التحويل
// (redirectUrl) عشان يوديه لصفحة الدفع يدفع فيها.
//
// 🆕 اعتماد كلي على GetPayIn بعد استبدال Paymob بالكامل من المشروع. العملة
// بقت ديناميكية حسب لغة الموقع الحالية عند المستخدم وقت الدفع — مش حسب أي
// إعداد ثابت في السيرفر. الـ client لازم يبعت "language" في الـ body
// (شوف app/lib/currency.js لخريطة لغة→عملة الكاملة):
//
// POST body: { type: "course" | "membership", id: "<courseId أو planId>", language?: "ar" | "en" | "es" }
//
// لو الـ client مبعتش language (client قديم أو خطأ)، بنقع افتراضيًا على
// "ar" → EGP، وهو نفس افتراض لغة الموقع في باقي المشروع.
//
// 🔒 التفعيل الفعلي (Enrollment أو تفعيل membership) بيحصل *بعد كده* في
// app/api/payments/getpayin/callback أو app/api/payments/getpayin/webhook —
// مش هنا، ومش قبل ما GetPayIn تأكد الدفع فعليًا. ده بالظبط اللي تعليق
// Payment.js بيقصده بـ "مصدر الحقيقة المالي".

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getCourseModel, getMembershipPlanModel, getPaymentModel } from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";
import { getCourseAccessForUser } from "@/app/lib/access";
import {
  createGetPayInInvoice,
  isGetPayInConfigured,
  amountCentsToDecimalString,
} from "@/app/lib/getpayin";
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

    // 🔒 SECURITY (Day 59): كل نداء هنا بيفتح GetPayIn Invoice (نداء خارجي
    // مكلف ماليًا وزمنيًا) — 10 محاولات/دقيقة لكل مستخدم كافية لأي استخدام
    // حقيقي ومنع أي محاولة سبام تفتح مئات الـ invoices الفاضية.
    const rl = await enforceRateLimit(request, {
      keyPrefix: "payments:checkout",
      limit: 10,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    if (!isGetPayInConfigured()) {
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

      amount = Math.round(priceInfo.amount * 100); // 🩹 FIX: course.prices مبالغ كاملة (جنيه/دولار/يورو) — لازم تتحول لقروش/سنت هنا (وحدة Payment.amount)، وإلا هيتحصّل 1% بس من السعر الفعلي.
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

    const payment = await Payment.create({
      user: session.user.id,
      type,
      course: courseRef,
      membershipPlan: membershipPlanRef,
      amount,
      currency,
      status: "pending",
      provider: "getpayin",
      metadata,
    });

    const { origin } = new URL(request.url);
    return await startGetPayInCheckout({ payment, amount, description, session, metadata, origin, currency });
  } catch (err) {
    console.error("[/api/payments/checkout] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

// تدفق GetPayIn: نداء واحد لإنشاء الـ invoice، وبعدين checkout_url المستضافة
// عندهم هي الـ redirectUrl اللي بنرجّعه للـ client (window.location.href
// كامل، مفيش iframe مضمّن في صفحتنا احنا — نفس فلسفة Paymob iframe URL
// القديمة، بس هنا صفحة GetPayIn المستضافة مباشرة).
async function startGetPayInCheckout({ payment, amount, currency, description, session, metadata, origin }) {
  const [firstName, ...rest] = (session.user.name || "NA NA").trim().split(" ");

  // 🔒 بنبني redirection_url إحنا (مش من إعداد ثابت في لوحة GetPayIn زي
  // Paymob) وبنحط Payment._id فيها — عشان صفحة الرجوع تعرف تربط الـ
  // request اللي جاي بالسجل المالي عندنا حتى قبل ما تشوف أي حاجة من
  // GetPayIn نفسها (شوف app/api/payments/getpayin/callback).
  const redirectionUrl = `${origin}/api/payments/getpayin/callback?payment=${payment._id.toString()}`;
  const webhookUrl = `${origin}/api/payments/getpayin/webhook`;

  let invoice;
  try {
    invoice = await createGetPayInInvoice({
      amount: amountCentsToDecimalString(amount),
      currency,
      firstName: firstName || "NA",
      lastName: rest.join(" ") || "NA",
      email: session.user.email,
      orderTitle: description,
      orderDetails: description,
      redirectionUrl,
      webhookUrl,
    });
  } catch (err) {
    console.error("[/api/payments/checkout] GetPayIn invoice creation failed:", err);
    payment.status = "failed";
    payment.metadata = { ...metadata, failureReason: "getpayin_invoice_creation_failed" };
    await payment.save();
    return jsonResponse({ error: "getpayin_error" }, 502);
  }

  // providerPaymentId بيتخزن هنا invoice id بتاع GetPayIn — ده اللي بنعتمد
  // عليه في lookup وقت الـ webhook/callback (مفيش merchant_order_id مباشر
  // زي Paymob في invoice creation عند GetPayIn).
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
}

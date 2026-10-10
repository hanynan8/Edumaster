// app/api/payments/[id]/route.js
//
// Phase 3 — اليوم 30-32: تفاصيل عملية دفع واحدة — بيُستخدم من صفحة النجاح
// (app/(pages)/payments/success) وصفحة الإيصال/الفاتورة البسيطة
// (app/(pages)/payments/receipt/[id]). صاحب العملية أو أدمن بس (نفس نمط
// isOwnerOrAdmin المستخدم في باقي المشروع).

import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { connectToMongo } from "@/app/lib/mongodb";
import { getPaymentModel, getCourseModel, getMembershipPlanModel } from "@/app/lib/models";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const Payment = getPaymentModel();
    // 🔧 لازم الموديلات دي تتسجل قبل الـ populate تحت، وإلا mongoose بيرمي
    // MissingSchemaError ("Model_course" / "Model_membership_plan" مش
    // مسجلين لسه) لو الروت ده أول حاجة بتتنفذ في instance جديد من السيرفر
    // (زي لما بيجي redirect من صفحة success على طول بعد الدفع) — وده كان
    // بيظهر كـ 500 هنا رغم إن الدفع نفسه نجح فعلاً.
    getCourseModel();
    getMembershipPlanModel();
    const payment = await Payment.findById(id)
      .populate("course", "title")
      .populate("membershipPlan", "name billingCycle")
      .populate("user", "name email")
      .lean();

    if (!payment) return jsonResponse({ error: "not_found" }, 404);

    // 🆕 دفعات "consultation" مالهاش user (guest checkout — الفورم نفسه
    // بيتبعت من غير تسجيل دخول، شوف consultation-checkout/route.js)، فمفيش
    // session نتحقق منها هنا أصلاً. الوصول بقى محمي بمعرفة Payment._id
    // نفسه بس (نفس فلسفة صفحة success/receipt العامة لأي حد معاه الرابط —
    // ده بالظبط نفس Payment._id اللي المستخدم رجع بيه من GetPayIn توًا).
    if (payment.type === "consultation" || payment.type === "placement_test") {
      return jsonResponse({
        id: payment._id.toString(),
        type: payment.type,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        provider: payment.provider,
        invoiceNumber: payment.invoiceNumber,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        customerName: payment.guestName || null,
        customerEmail: payment.guestEmail || null,
      });
    }

    // course/membership: لسه محتاجين session — صاحب الدفعة أو أدمن بس.
    const session = await getServerSession(authOptions);
    if (!session?.user) return jsonResponse({ error: "unauthorized" }, 401);

    const isOwner = payment.user?._id?.toString() === session.user.id;
    if (!isOwner && session.user.role !== "admin") {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    return jsonResponse({
      id: payment._id.toString(),
      type: payment.type,
      course: payment.course?._id?.toString() || null,
      courseTitle: payment.course?.title || null,
      membershipPlan: payment.membershipPlan?._id?.toString() || null,
      membershipPlanName: payment.membershipPlan?.name || null,
      billingCycle: payment.membershipPlan?.billingCycle || payment.metadata?.billingCycle || null,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      provider: payment.provider,
      invoiceNumber: payment.invoiceNumber,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      customerName: payment.user?.name || null,
      customerEmail: payment.user?.email || null,
    });
  } catch (err) {
    console.error("[/api/payments/[id]] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
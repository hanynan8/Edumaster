// app/api/payments/[id]/route.js
//
// Phase 3 — اليوم 30-32: تفاصيل عملية دفع واحدة — بيُستخدم من صفحة النجاح
// (app/(pages)/payments/success) وصفحة الإيصال/الفاتورة البسيطة
// (app/(pages)/payments/receipt/[id]). صاحب العملية أو أدمن بس (نفس نمط
// isOwnerOrAdmin المستخدم في باقي المشروع).

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getPaymentModel } from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(request, { params }) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "invalid_id" }, 400);

    await connectToMongo();
    const Payment = getPaymentModel();
    const payment = await Payment.findById(id)
      .populate("course", "title")
      .populate("membershipPlan", "name billingCycle")
      .populate("user", "name email")
      .lean();

    if (!payment) return jsonResponse({ error: "not_found" }, 404);

    const isOwner = payment.user?._id?.toString() === session.user.id;
    if (!isOwner && session.user.role !== "admin") {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    return jsonResponse({
      id: payment._id.toString(),
      type: payment.type,
      courseTitle: payment.course?.title || null,
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
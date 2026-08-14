// app/api/payments/route.js
//
// Phase 3 — اليوم 31-32: "سجل المدفوعات" بتاع الطالب — كل عمليات الدفع
// اللي عملها (كورسات + اشتراكات membership)، بأحدث حاجة الأول. كل مستخدم
// بيشوف عملياته هو بس (فلترة بـ session.user.id) — مفيش أي endpoint هنا
// بيسمح تشوف مدفوعات مستخدم تاني؛ ده دور app/api/admin/revenue بس للأدمن.

import { connectToMongo } from "@/app/lib/mongodb";
import { getPaymentModel } from "@/app/lib/models";
import { requireSession } from "@/app/lib/rbac";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function serializePayment(p) {
  return {
    id: p._id.toString(),
    type: p.type,
    course: p.course?._id ? p.course._id.toString() : p.course?.toString?.() || null,
    courseTitle: p.course?.title || null,
    membershipPlan: p.membershipPlan?._id
      ? p.membershipPlan._id.toString()
      : p.membershipPlan?.toString?.() || null,
    membershipPlanName: p.membershipPlan?.name || null,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    provider: p.provider,
    invoiceNumber: p.invoiceNumber,
    paidAt: p.paidAt,
    refundedAt: p.refundedAt,
    createdAt: p.createdAt,
  };
}

export async function GET(request) {
  try {
    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    await connectToMongo();
    const Payment = getPaymentModel();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));

    const filter = { user: session.user.id };
    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("course", "title")
        .populate("membershipPlan", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter),
    ]);

    return jsonResponse({
      payments: payments.map(serializePayment),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    console.error("[/api/payments] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
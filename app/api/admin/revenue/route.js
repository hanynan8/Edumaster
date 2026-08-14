// app/api/admin/revenue/route.js
//
// Phase 3 — اليوم 31-32: صفحة متابعة الإيرادات للأدمن. بيرجّع: إجمالي
// الإيرادات الناجحة (كورسات + اشتراكات)، تقسيم حسب النوع، اتجاه آخر 6
// شهور، عدد العمليات حسب الحالة (succeeded/pending/failed/refunded)،
// وأحدث 15 عملية ناجحة — أدمن بس (requireRole).

import { connectToMongo } from "@/app/lib/mongodb";
import { getPaymentModel } from "@/app/lib/models";
import { requireRole } from "@/app/lib/rbac";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET() {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;

    await connectToMongo();
    const Payment = getPaymentModel();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [totals, byType, monthly, recent, statusCounts] = await Promise.all([
      Payment.aggregate([
        { $match: { status: "succeeded" } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { status: "succeeded" } },
        { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { status: "succeeded", paidAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { y: { $year: "$paidAt" }, m: { $month: "$paidAt" } },
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.y": 1, "_id.m": 1 } },
      ]),
      Payment.find({ status: "succeeded" })
        .populate("user", "name email")
        .populate("course", "title")
        .populate("membershipPlan", "name")
        .sort({ paidAt: -1 })
        .limit(15)
        .lean(),
      Payment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    return jsonResponse({
      totalRevenue: totals[0]?.total || 0,
      totalSucceededPayments: totals[0]?.count || 0,
      byType: byType.map((t) => ({ type: t._id, total: t.total, count: t.count })),
      monthly: monthly.map((m) => ({ year: m._id.y, month: m._id.m, total: m.total, count: m.count })),
      statusCounts: statusCounts.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      recentPayments: recent.map((p) => ({
        id: p._id.toString(),
        type: p.type,
        customerName: p.user?.name || null,
        customerEmail: p.user?.email || null,
        itemTitle: p.course?.title || p.membershipPlan?.name || null,
        amount: p.amount,
        currency: p.currency,
        invoiceNumber: p.invoiceNumber,
        paidAt: p.paidAt,
      })),
    });
  } catch (err) {
    console.error("[/api/admin/revenue] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
// app/api/admin/revenue/route.js
//
// Phase 3 — اليوم 31-32: صفحة متابعة الإيرادات للأدمن. بيرجّع: إجمالي
// الإيرادات الناجحة (كورسات + اشتراكات)، تقسيم حسب النوع، اتجاه آخر 6
// شهور، عدد العمليات حسب الحالة (succeeded/pending/failed/refunded)،
// وأحدث 15 عملية ناجحة — أدمن بس (requireRole).

import { connectToMongo } from "@/app/lib/mongodb";
import { getPaymentModel, getCourseModel, getMembershipPlanModel } from "@/app/lib/models";
import { requireRole } from "@/app/lib/rbac";
import { REVENUE_TRACKING_ENABLED } from "@/app/lib/revenueConfig";

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

    // الإيرادات متعطلة (revenueConfig.js): كل الأرقام صفر ومفيش عمليات دفع.
    if (!REVENUE_TRACKING_ENABLED) {
      return jsonResponse({
        totalRevenue: 0,
        totalSucceededPayments: 0,
        currencies: ["EGP"],
        byCurrency: {
          EGP: { totalRevenue: 0, totalSucceededPayments: 0, byType: [], monthly: [] },
        },
        statusCounts: {},
        recentPayments: [],
      });
    }

    await connectToMongo();
    const Payment = getPaymentModel();
    // 🔧 نفس فيكس /api/payments و /api/payments/[id] — لازم الموديلات دي
    // تتسجل قبل populate("course"/"membershipPlan") تحت.
    getCourseModel();
    getMembershipPlanModel();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // 🩹 FIX (Total Revenue غلط): قبل كده كل الإجماليات كانت بتجمع كل
    // العملات مع بعض (EGP+USD+EUR كرقم واحد) وبتحسب تفعيلات الأدمن اليدوية
    // (provider "manual") كإيراد رغم إن مفيش فلوس اتحصّلت. دلوقتي:
    //   - بنستبعد provider "manual" من كل حسابات الإيراد.
    //   - كل الإجماليات (الكلي/حسب النوع/الشهري) بتتجمّع لكل عملة لوحدها.
    const realRevenue = { status: "succeeded", provider: { $ne: "manual" } };
    const currencyKey = { $ifNull: ["$currency", "EGP"] };

    const [totals, byType, monthly, recent, statusCounts] = await Promise.all([
      Payment.aggregate([
        { $match: realRevenue },
        { $group: { _id: currencyKey, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: realRevenue },
        { $group: { _id: { c: currencyKey, t: "$type" }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { ...realRevenue, paidAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { c: currencyKey, y: { $year: "$paidAt" }, m: { $month: "$paidAt" } },
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.y": 1, "_id.m": 1 } },
      ]),
      Payment.find(realRevenue)
        .populate("user", "name email")
        .populate("course", "title")
        .populate("membershipPlan", "name")
        .sort({ paidAt: -1 })
        .limit(15)
        .lean(),
      Payment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    const byCurrency = {};
    const bucket = (c) =>
      (byCurrency[c] ||= { totalRevenue: 0, totalSucceededPayments: 0, byType: [], monthly: [] });
    totals.forEach((t) => {
      const b = bucket(t._id);
      b.totalRevenue = t.total;
      b.totalSucceededPayments = t.count;
    });
    byType.forEach((t) => bucket(t._id.c).byType.push({ type: t._id.t, total: t.total, count: t.count }));
    monthly.forEach((m) =>
      bucket(m._id.c).monthly.push({ year: m._id.y, month: m._id.m, total: m.total, count: m.count })
    );

    // EGP أول واحدة دايمًا (حتى لو فاضية) عشان الواجهة ليها افتراضي ثابت.
    const currencies = ["EGP", ...Object.keys(byCurrency).filter((c) => c !== "EGP")];
    bucket("EGP");

    return jsonResponse({
      // توافق مع الشكل القديم: إجمالي الجنيه المصري بس (بالقروش).
      totalRevenue: byCurrency.EGP.totalRevenue,
      totalSucceededPayments: byCurrency.EGP.totalSucceededPayments,
      currencies,
      byCurrency,
      statusCounts: statusCounts.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      recentPayments: recent.map((p) => ({
        id: p._id.toString(),
        type: p.type,
        customerName: p.user?.name || p.guestName || null,
        customerEmail: p.user?.email || p.guestEmail || null,
        itemTitle: p.course?.title || p.membershipPlan?.name || null,
        amount: p.amount,
        currency: p.currency,
        provider: p.provider,
        invoiceNumber: p.invoiceNumber,
        paidAt: p.paidAt,
      })),
    });
  } catch (err) {
    console.error("[/api/admin/revenue] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
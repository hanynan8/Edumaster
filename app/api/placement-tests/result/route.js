// app/api/placement-tests/result/route.js
//
// GET ?payment=<paymentId> — نتيجة الاختبار للطالب، *بعد* الدفع بس.
// الوصول محمي بمعرفة Payment._id (نفس فلسفة صفحة النجاح/الإيصال للدفعات
// الضيف في app/api/payments/[id]) + لازم الدفعة تكون type=placement_test
// وحالتها succeeded، وإلا مفيش نتيجة تتسلّم.

import mongoose from "mongoose";
import { connectToMongo } from "@/app/lib/mongodb";
import { getPaymentModel } from "@/app/lib/models";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import { getPlacementTestsCollection } from "@/app/lib/placementTest";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(request) {
  try {
    const rl = await enforceRateLimit(request, {
      keyPrefix: "placement-tests:result",
      limit: 30,
      windowSeconds: 60,
    });
    if (rl) return rl;

    const paymentId = new URL(request.url).searchParams.get("payment");
    if (!mongoose.Types.ObjectId.isValid(paymentId)) return jsonResponse({ error: "invalid_request" }, 400);

    await connectToMongo();
    const payment = await getPaymentModel().findById(paymentId).lean();
    if (!payment || payment.type !== "placement_test" || !payment.placementTest) {
      return jsonResponse({ error: "not_found" }, 404);
    }
    if (payment.status !== "succeeded") return jsonResponse({ error: "payment_required" }, 402);

    const doc = await getPlacementTestsCollection().findOne({ _id: payment.placementTest });
    if (!doc) return jsonResponse({ error: "not_found" }, 404);

    return jsonResponse({
      name: doc.name,
      score: doc.score,
      maxScore: doc.maxScore,
      answeredCount: doc.answeredCount,
      totalQuestions: doc.totalQuestions,
    });
  } catch (err) {
    console.error("[/api/placement-tests/result] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

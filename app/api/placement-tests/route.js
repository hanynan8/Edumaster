// app/api/placement-tests/route.js
//
// POST — استلام إجابات اختبار تحديد المستوى (إسباني) بعد ما الطالب يخلّصه.
// بيتم التصحيح هنا على السيرفر وبيتخزن في كولكشن "placement_tests" بحالة
// دفع "unpaid". 🔒 الراوت عمدًا مبيرجعش الدرجة للـ client — النتيجة مدفوعة،
// والطالب مبيستلمها غير بعد نجاح الدفع (شوف ./result/route.js).
//
// الراوت عام (الاختبار نفسه من غير تسجيل دخول، زي فورم الاستشارة) فيه rate
// limit بالـ IP.

import { connectToMongo } from "@/app/lib/mongodb";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import { getPlacementTestsCollection, sanitizeAnswers, scoreAnswers } from "@/app/lib/placementTest";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  try {
    const rl = await enforceRateLimit(request, {
      keyPrefix: "placement-tests:submit",
      limit: 5,
      windowSeconds: 60,
    });
    if (rl) return rl;

    const body = await request.json().catch(() => null);
    const name = String(body?.name || "").trim().slice(0, 120);
    const studentNumber = String(body?.studentNumber || "").trim().slice(0, 60);
    const email = String(body?.email || "").trim().slice(0, 160);
    const language = ["ar", "en", "es"].includes(body?.language) ? body.language : "ar";

    if (!name || !studentNumber || !EMAIL_RE.test(email)) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const answers = sanitizeAnswers(body?.answers);
    const result = scoreAnswers(answers);

    await connectToMongo();
    const col = getPlacementTestsCollection();
    const inserted = await col.insertOne({
      name,
      studentNumber,
      email,
      language,
      answers,
      score: result.score,
      maxScore: result.maxScore,
      answeredCount: result.answered,
      totalQuestions: result.totalQuestions,
      paymentStatus: "unpaid",
      createdAt: new Date(),
    });

    return jsonResponse({ id: inserted.insertedId.toString() }, 201);
  } catch (err) {
    console.error("[/api/placement-tests] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

// app/api/placement-tests/custom/[testId]/route.js
//
// GET — اختبار مخصص (B1, B2, ...) للطالب: الأسئلة وخيارات الإجابة + روابط الصوتيات المرفوعة +
// جدول المستويات. عام (من غير تسجيل دخول زي A1/A2). الاختبار لازم يكون منشور، وإلا 404.
// 🔒 مفيش مفتاح إجابات ولا نصوص تسجيلات في الرد (toPublicTest بيشيلهم).

import { connectToMongo } from "@/app/lib/mongodb";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import { resolveTest, toPublicTest } from "@/app/lib/customPlacementTests";
import { getAudioMap } from "@/app/lib/placementTest";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(request, { params }) {
  try {
    const rl = await enforceRateLimit(request, {
      keyPrefix: "placement-tests:custom-get",
      limit: 60,
      windowSeconds: 60,
    });
    if (rl) return rl;

    const { testId } = await params;
    await connectToMongo();
    const resolved = await resolveTest(testId, { strict: true });
    if (!resolved?.custom) return jsonResponse({ error: "not_found" }, 404);

    const audio = await getAudioMap(resolved.ref);
    return jsonResponse({ test: toPublicTest(resolved.def), audio });
  } catch (err) {
    console.error("[/api/placement-tests/custom] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

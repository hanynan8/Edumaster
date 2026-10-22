// app/api/placement-tests/audio/route.js
//
// GET ?test=a1|a2 — روابط صوتيات اختبار تحديد المستوى (عام، من غير تسجيل دخول زي الاختبار نفسه).
// بيرجع { audio: { "1": url, ... } } للخانات اللي اتّرفع لها صوت بس. الرفع من لوحة الأدمن.
// ?test مش موجود/غلط → a1.

import { connectToMongo } from "@/app/lib/mongodb";
import { getAudioMap } from "@/app/lib/placementTest";
import { normalizeTestId } from "@/app/lib/placementTests";

export async function GET(request) {
  try {
    const testId = normalizeTestId(new URL(request.url).searchParams.get("test"));
    await connectToMongo();
    const audio = await getAudioMap(testId);
    return new Response(JSON.stringify({ audio }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[/api/placement-tests/audio] GET error:", err);
    return new Response(JSON.stringify({ audio: {} }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
}

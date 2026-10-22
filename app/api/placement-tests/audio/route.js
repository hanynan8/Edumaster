// app/api/placement-tests/audio/route.js
//
// GET ?test=a1|a2|<id اختبار مخصص منشور> — روابط صوتيات اختبار تحديد المستوى (عام، من غير تسجيل دخول زي الاختبار نفسه).
// بيرجع { audio: { "1": url, ... } } للخانات اللي اتّرفع لها صوت بس. الرفع من لوحة الأدمن.
// ?test مش موجود/غلط → a1.

import { connectToMongo } from "@/app/lib/mongodb";
import { getAudioMap } from "@/app/lib/placementTest";
import { resolveTest } from "@/app/lib/customPlacementTests";

export async function GET(request) {
  try {
    await connectToMongo();
    const resolved = await resolveTest(new URL(request.url).searchParams.get("test"));
    // اختبار مخصص مش منشور → من غير صوتيات (الطالب مبيقدرش يفتحه أصلًا)
    const audio = resolved ? await getAudioMap(resolved.ref) : {};
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

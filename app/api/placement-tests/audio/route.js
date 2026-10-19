// app/api/placement-tests/audio/route.js
//
// GET — روابط صوتيات اختبار تحديد المستوى (عام، من غير تسجيل دخول زي الاختبار نفسه).
// بيرجع { audio: { "1": url, ... } } للخانات اللي اتّرفع لها صوت بس. الرفع من لوحة الأدمن.

import { connectToMongo } from "@/app/lib/mongodb";
import { getAudioMap } from "@/app/lib/placementTest";

export async function GET() {
  try {
    await connectToMongo();
    const audio = await getAudioMap();
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

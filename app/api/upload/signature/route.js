// app/api/upload/signature/route.js
//
// اليوم 9 (محدّث لـ Bunny): بيولّد توقيع مؤقت عشان الـ client يرفع *فيديو*
// مباشرة من المتصفح لـ Bunny Stream من غير ما الملف يعدي على سيرفرنا (شوف
// شرح القرار في app/lib/bunny.js). الراوت ده هو نقطة التحقق الوحيدة: أي حد
// يقدر يوصله (teacher/admin بس) يقدر ياخد توقيع، وأي حد تاني مش هيقدر يرفع
// حاجة من غير توقيع صالح ومرتبط بـ videoId محدد سلفًا.
//
// 🎞️ الصور والـ PDF بقوا ليهم راوت تاني: /api/upload/file (Bunny Storage،
// عن طريق proxy على السيرفر — Bunny مش بيدعم signed upload زي الفيديو).

import { requireRole } from "@/app/lib/rbac";
import {
  createStreamVideo,
  generateStreamUploadAuthorization,
  buildStreamPlaybackUrl,
  isBunnyStreamConfigured,
} from "@/app/lib/bunny";
import { enforceRateLimit } from "@/app/lib/rateLimit";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  try {
    if (!isBunnyStreamConfigured()) {
      return jsonResponse({ error: "upload_not_configured" }, 503);
    }

    const auth = await requireRole(["teacher", "admin"]);
    if (auth.response) return auth.response;

    // 🔒 SECURITY (Day 59): كل نداء بينشئ فيديو جديد في Bunny Stream (مورد
    // خارجي له تكلفة تخزين) — 15/دقيقة كافية لأي رفع دفعة دروس حقيقي.
    const rl = await enforceRateLimit(request, {
      keyPrefix: "upload:signature",
      limit: 15,
      windowSeconds: 60,
      extraKey: `user:${auth.session.user.id}`,
    });
    if (rl) return rl;

    const body = await request.json().catch(() => null);
    const kind = body?.kind;

    // 🔒 الراوت ده بقى مخصص للفيديو بس. الصور والـ PDF بتتبعت لـ /api/upload/file
    if (kind !== "video") {
      return jsonResponse(
        { error: "invalid_kind", message: "استخدم /api/upload/file للصور والـ PDF" },
        400
      );
    }

    // 🔒 العنوان اللي بنسجله في Bunny Stream مش جاي من الـ client، بنولّده
    // إحنا عشان منسمحش بأي string عشوائي يتخزن هناك.
    const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim().slice(0, 200) : "lesson-video";

    const { videoId } = await createStreamVideo({ title });
    const authPayload = generateStreamUploadAuthorization({ videoId });

    return jsonResponse({
      ...authPayload,
      playbackUrl: buildStreamPlaybackUrl(videoId),
    });
  } catch (err) {
    console.error("[/api/upload/signature] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
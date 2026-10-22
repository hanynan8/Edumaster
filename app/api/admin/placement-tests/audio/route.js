// app/api/admin/placement-tests/audio/route.js
//
// إدارة صوتيات اختبارات تحديد المستوى (أدمن بس) — 4 خانات (مهام الاستماع الأربعة) لكل اختبار.
//   GET ?test=a1|a2            → حالة الخانات (اسم الملف/الحجم/رابط التشغيل + نص التسجيل script لو متاح)
//   POST (form)                → test (a1|a2) + slot (1–4) + file (صوت) → بيترفع على Bunny Storage
//                                ويظهر في الاختبار فورًا
//   DELETE ?test=a2&slot=N     → حذف الصوت (المهمة بتتخفي من الاختبار لحد ما يتّرفع غيره)
// test مش موجود/غلط → a1 (توافق مع الكود القديم).
// الرفع بيعدي من السيرفر لأن مفتاح Bunny Storage سري (زي /api/upload/file).

import { connectToMongo } from "@/app/lib/mongodb";
import { requireRole } from "@/app/lib/rbac";
import { enforceRateLimit } from "@/app/lib/rateLimit";
import {
  uploadToStorage,
  isBunnyStorageConfigured,
  buildStoragePublicUrl,
  resolveSecureStoredUrl,
} from "@/app/lib/bunny";
import { AUDIO_SLOTS, getAudioTracks, setAudioTrack } from "@/app/lib/placementTest";
import { getPlacementTest, normalizeTestId } from "@/app/lib/placementTests";
import { getAudioScript } from "@/app/lib/placementAudioScripts";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const MAX_BYTES = 30 * 1024 * 1024; // 30MB
const ALLOWED_MIME = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
];

function parseSlot(value) {
  const slot = Number(value);
  return AUDIO_SLOTS.includes(slot) ? slot : null;
}

function serialize(tracks) {
  const out = {};
  for (const slot of AUDIO_SLOTS) {
    const t = tracks[slot];
    out[slot] = t?.path
      ? {
          name: t.name,
          size: t.size,
          uploadedAt: t.uploadedAt,
          url: resolveSecureStoredUrl(buildStoragePublicUrl(t.path)),
        }
      : null;
  }
  return out;
}

// 🔒 نصوص التسجيل (للأدمن بس) — بنرجّعها من الـ API ده بس، مش من bundle المتصفح
function scriptsFor(testId) {
  const out = {};
  for (const slot of AUDIO_SLOTS) out[slot] = getAudioScript(testId, slot);
  return out;
}

export async function GET(request) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;
    const testId = normalizeTestId(new URL(request.url).searchParams.get("test"));
    await connectToMongo();
    return jsonResponse({
      test: testId,
      tracks: serialize(await getAudioTracks(testId)),
      scripts: scriptsFor(testId),
    });
  } catch (err) {
    console.error("[/api/admin/placement-tests/audio] GET error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function POST(request) {
  try {
    if (!isBunnyStorageConfigured()) return jsonResponse({ error: "upload_not_configured" }, 503);
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;

    const rl = await enforceRateLimit(request, {
      keyPrefix: "placement-tests:audio-upload",
      limit: 20,
      windowSeconds: 60,
      extraKey: `user:${auth.session.user.id}`,
    });
    if (rl) return rl;

    const formData = await request.formData().catch(() => null);
    const testId = normalizeTestId(formData?.get("test"));
    const slot = parseSlot(formData?.get("slot"));
    const file = formData?.get("file");
    if (!slot) return jsonResponse({ error: "invalid_slot" }, 400);
    if (!file || typeof file.arrayBuffer !== "function") return jsonResponse({ error: "file_required" }, 400);

    const mime = (file.type || "").toLowerCase();
    if (!ALLOWED_MIME.includes(mime)) return jsonResponse({ error: "invalid_mime", mime }, 400);
    if (file.size > MAX_BYTES) return jsonResponse({ error: "file_too_large", maxBytes: MAX_BYTES }, 400);

    // المسار مبني من بيانات معروفة بس (رقم الخانة + وقت الرفع) — مفيش path من الـ client.
    // اسم جديد في كل رفعة عشان الـ CDN ميرجعش النسخة القديمة المتخزنة.
    const ext = mime.includes("wav") ? "wav" : mime.includes("ogg") ? "ogg" : mime.includes("webm") ? "webm" : mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac") ? "m4a" : "mp3";
    // (كل اختبار له فولدر خاص: audioPathPrefix في placementTests.js)
    const path = `${getPlacementTest(testId).audioPathPrefix}-${slot}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToStorage({ path, body: buffer, contentType: mime });

    await connectToMongo();
    await setAudioTrack(
      slot,
      {
        path,
        name: String(file.name || `audio-${slot}`).slice(0, 160),
        size: file.size,
        uploadedAt: new Date(),
      },
      testId
    );
    return jsonResponse({ ok: true, test: testId, tracks: serialize(await getAudioTracks(testId)) });
  } catch (err) {
    console.error("[/api/admin/placement-tests/audio] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

export async function DELETE(request) {
  try {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;
    const params = new URL(request.url).searchParams;
    const testId = normalizeTestId(params.get("test"));
    const slot = parseSlot(params.get("slot"));
    if (!slot) return jsonResponse({ error: "invalid_slot" }, 400);
    await connectToMongo();
    await setAudioTrack(slot, null, testId); // الملف القديم بيفضل على Bunny (ممكن يتمسح يدويًا) — بس مبقاش مربوط بالاختبار
    return jsonResponse({ ok: true, test: testId, tracks: serialize(await getAudioTracks(testId)) });
  } catch (err) {
    console.error("[/api/admin/placement-tests/audio] DELETE error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}

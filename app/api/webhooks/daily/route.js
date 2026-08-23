// app/api/webhooks/daily/route.js
//
// 🆕 POST /api/webhooks/daily — بيستقبل أحداث Daily.co (Webhooks). الحدث
// اللي بيهمنا هنا هو "recording.ready-to-download": لما تسجيل سحابي
// (enable_recording: "cloud"، شوف app/lib/daily.js createMeetingToken)
// يخلص ويبقى جاهز، بنلاقي المحاضرة بتاعته عن طريق room_name ونضيف
// الـ recording ID بتاعه في Meeting.recordings — كده الطالب يقدر يشوفه
// بعدين من /meet (شوف app/meet/page.jsx).
//
// 🔒 SECURITY: لازم نتأكد إن الطلب فعلًا جاي من Daily مش من أي حد عارف
// الرابط — Daily بتوقّع كل webhook بـ HMAC-SHA256 على الـ body باستخدام
// secret بيتحدد وقت إنشاء الـ webhook من Daily Dashboard (Developers →
// Webhooks)، وبتبعته في هيدر X-Webhook-Signature. لازم نضبطه في env
// DAILY_WEBHOOK_SECRET. لو مش متظبط، بنرفض الطلب في production (نفس
// أسلوب CRON_SECRET في app/api/cron/membership-expiry) بدل قبول أي حاجة.
//
// 📋 إعداد الـ webhook (مرة واحدة، من حساب أدمن المنصة على Daily):
//   Daily Dashboard → Developers → Webhooks → Create webhook
//   URL: https://<your-domain>/api/webhooks/daily
//   Event: recording.ready-to-download
//   → انسخ الـ HMAC secret اللي Daily بتديهولك في DAILY_WEBHOOK_SECRET.

import crypto from "crypto";
import { connectToMongo } from "@/app/lib/mongodb";
import { getMeetingModel } from "@/app/lib/models";

const WEBHOOK_SECRET = process.env.DAILY_WEBHOOK_SECRET;

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// Daily بتوقّع بصيغة "t,v1=<hex_hmac>" — v1 هو HMAC-SHA256(timestamp + "." + rawBody).
function isValidSignature(rawBody, signatureHeader) {
  if (!WEBHOOK_SECRET || !signatureHeader) return false;
  try {
    const parts = Object.fromEntries(
      signatureHeader.split(",").map((p) => {
        const [k, v] = p.split("=");
        return [k.trim(), v];
      })
    );
    const timestamp = signatureHeader.split(",")[0];
    if (!parts.v1) return false;
    const signedPayload = `${timestamp}.${rawBody}`;
    const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(signedPayload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
  } catch {
    return false;
  }
}

export async function POST(request) {
  try {
    const rawBody = await request.text();

    if (WEBHOOK_SECRET) {
      const signature = request.headers.get("x-webhook-signature") || request.headers.get("X-Webhook-Signature");
      if (!isValidSignature(rawBody, signature)) {
        return jsonResponse({ error: "invalid_signature" }, 401);
      }
    } else if (process.env.NODE_ENV === "production") {
      console.error("[webhooks/daily] DAILY_WEBHOOK_SECRET not set in production — refusing request");
      return jsonResponse({ error: "webhook_secret_not_configured" }, 503);
    } else {
      console.warn("[webhooks/daily] DAILY_WEBHOOK_SECRET not set — skipping signature check (dev only)");
    }

    const event = JSON.parse(rawBody || "{}");

    if (event?.type !== "recording.ready-to-download") {
      // مفيش حدث تاني محتاجينه دلوقتي — بنرد 200 عادي عشان Daily متعتبروش
      // فشل وتعيد المحاولة على الفاضي.
      return jsonResponse({ ignored: true });
    }

    const roomName = event?.payload?.room_name;
    const recordingId = event?.payload?.recording_id || event?.payload?.id;
    const durationSeconds = event?.payload?.duration ?? null;
    if (!roomName || !recordingId) return jsonResponse({ error: "missing_payload" }, 400);

    await connectToMongo();
    const Meeting = getMeetingModel();
    const meeting = await Meeting.findOne({ dailyRoomName: roomName });
    if (!meeting) {
      // ممكن الغرفة اتمسحت من عندنا لكن Daily لسه بتبعت webhook قديم —
      // مش خطأ حقيقي، بنتجاهل بهدوء.
      return jsonResponse({ ignored: true, reason: "meeting_not_found" });
    }

    const alreadyLinked = meeting.recordings.some((r) => r.dailyRecordingId === recordingId);
    if (!alreadyLinked) {
      meeting.recordings.push({ dailyRecordingId: recordingId, durationSeconds });
      await meeting.save();
    }

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[/api/webhooks/daily] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
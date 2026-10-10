// app/lib/dailyWebhook.js
//
// التحقق من توقيع webhooks بتاعة Daily.co (docs.daily.co/reference/rest-api/webhooks):
//   signature = base64( HMAC-SHA256( base64Decode(hmacSecret), `${X-Webhook-Timestamp}.${body}` ) )
// مفصول عن app/api/webhooks/daily/route.js لأن Next.js مابيسمحش بتصدير دوال مساعدة
// من ملفات route (غير GET/POST/... وإعدادات الراوت)، ولعشان يتختبر لوحده.

import crypto from "crypto";

export function isValidDailySignature(rawBody, signatureHeader, timestampHeader, secret) {
  if (!secret || !signatureHeader || !timestampHeader) return false;
  try {
    const key = Buffer.from(secret, "base64");
    // Daily بتوقّع على JSON.stringify(event) في مثالها الرسمي — بنجرّب الـ raw body
    // الأول (الأدق) وبعدين إعادة التسلسل؛ أي واحد يطابق يعدّي.
    const candidates = [rawBody];
    try {
      const reserialized = JSON.stringify(JSON.parse(rawBody));
      if (reserialized !== rawBody) candidates.push(reserialized);
    } catch {
      // body مش JSON — هنفضل على الـ raw بس.
    }
    const provided = Buffer.from(String(signatureHeader).trim());
    return candidates.some((body) => {
      const expected = Buffer.from(
        crypto.createHmac("sha256", key).update(`${timestampHeader}.${body}`).digest("base64")
      );
      return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
    });
  } catch {
    return false;
  }
}

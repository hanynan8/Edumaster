// app/lib/bunnyClient.js
//
// هيلبرز آمنة تُستخدم جوه client components (زي مشغّل الفيديو) — من غير ما
// نستورد app/lib/bunny.js اللي فيه secrets واستدعاء "crypto". لو استوردنا
// bunny.js جوه component بـ "use client"، الـ bundler هيحط الملف كله
// (حتى الأجزاء اللي مش بنستخدمها) جوه الـ browser bundle، وده مينفعش لأنه
// بيحتوي على أسرار سيرفر. فالملف ده منفصل تمامًا ومفيهوش أي سر.
//
// بيعتمد على متغير بيئة عام (آمن يبان في المتصفح):
//   NEXT_PUBLIC_BUNNY_STREAM_CDN_HOSTNAME=vz-xxxxxxxx-xxx.b-cdn.net
// تلاقي القيمة دي في: Bunny Dashboard → Stream → مكتبة الفيديو بتاعتك →
// "CDN Hostname". الدومين ده عام (زي أي رابط CDN) مش سري خالص.

/** بيطلع videoId من رابط التشغيل المخزّن (آخر جزء من الـ URL). */
export function extractStreamVideoId(playbackUrl) {
  if (!playbackUrl) return null;
  const parts = playbackUrl.split("/").filter(Boolean);
  return parts[parts.length - 1] || null;
}

/** رابط صورة الغلاف (thumbnail) اللي Bunny بيولّدها تلقائيًا لكل فيديو. */
export function buildStreamThumbnailUrl(playbackUrl) {
  const videoId = extractStreamVideoId(playbackUrl);
  const cdnHost = process.env.NEXT_PUBLIC_BUNNY_STREAM_CDN_HOSTNAME;
  if (!videoId || !cdnHost) return null;
  return `https://${cdnHost}/${videoId}/thumbnail.jpg`;
}
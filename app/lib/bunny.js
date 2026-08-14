// app/lib/bunny.js
//
// قرار اليوم 9 (محدّث): كنا شغّالين بـ Cloudinary، ودلوقتي حوّلنا لـ Bunny.net.
// المشروع بيستخدم خدمتين مختلفتين من Bunny حسب نوع الملف:
//
// 1) الفيديو → Bunny Stream
//    خدمة مخصصة للفيديو بتعمل transcoding + HLS + player جاهز. بتدعم رفع
//    مباشر من المتصفح بروتوكول TUS (resumable upload) بتوقيع مؤقت — نفس
//    فكرة الـ signed direct upload اللي كانت شغالة مع Cloudinary تمامًا:
//    الفيديو (اللي ممكن يوصل مئات الـ MB) بيروح لـ Bunny على طول من غير
//    ما يعدي على سيرفرنا، وإحنا بس بنولّد توقيع صالح لمدة قصيرة.
//
// 2) الصور والـ PDF → Bunny Storage
//    تخزين عام (زي S3) لكنه، على عكس Cloudinary، **مش بيدعم signed/scoped
//    upload tokens** — الرفع بيتطلب AccessKey سري ثابت لكل الـ storage zone.
//    مينفعش نبعته للمتصفح (أي حد ياخده يقدر يرفع/يمسح أي حاجة في الـ zone
//    كله). فالحل: الرفع بيعدي على راوت عندنا (/api/upload/file) اللي
//    بيتحقق من الصلاحية (teacher/admin) ثم يعمل proxy/stream للملف لـ
//    Bunny Storage بالمفتاح السري من السيرفر بس. الصور والـ PDF عمومًا
//    أصغر بكتير من الفيديو فمش هيصطدموا بحدود body size زي ما كان
//    هيحصل لو عملنا كده مع الفيديو.
//
// env vars مطلوبة (.env.local):
//   BUNNY_STREAM_LIBRARY_ID=
//   BUNNY_STREAM_API_KEY=
//   BUNNY_STORAGE_ZONE_NAME=
//   BUNNY_STORAGE_ACCESS_KEY=
//   BUNNY_STORAGE_REGION_HOST=storage.bunnycdn.com   (اختياري، ده الافتراضي)
//   BUNNY_STORAGE_PULL_ZONE_HOSTNAME=                (مثلاً: my-zone.b-cdn.net)
//
// env var عام إضافي (مش سري، آمن يتحط NEXT_PUBLIC) بيُستخدم في
// app/lib/bunnyClient.js + app/components/LessonVideoPlayer.jsx عشان نبني
// رابط صورة الغلاف (thumbnail) بتاعة الفيديو من غير API call إضافي:
//   NEXT_PUBLIC_BUNNY_STREAM_CDN_HOSTNAME=   (مثلاً: vz-xxxxxxxx-xxx.b-cdn.net
//   — تلاقيها في Bunny Dashboard → Stream → مكتبة الفيديو → CDN Hostname)

import crypto from "crypto";

const STREAM_API_BASE = "https://video.bunnycdn.com";
const STREAM_TUS_ENDPOINT = "https://video.bunnycdn.com/tusupload";
const DEFAULT_STORAGE_REGION_HOST = "storage.bunnycdn.com";

// ---------------------------------------------------------------------------
// إعدادات عامة
// ---------------------------------------------------------------------------

export function isBunnyStreamConfigured() {
  return Boolean(process.env.BUNNY_STREAM_LIBRARY_ID && process.env.BUNNY_STREAM_API_KEY);
}

export function isBunnyStorageConfigured() {
  return Boolean(
    process.env.BUNNY_STORAGE_ZONE_NAME &&
      process.env.BUNNY_STORAGE_ACCESS_KEY &&
      process.env.BUNNY_STORAGE_PULL_ZONE_HOSTNAME
  );
}

// بتفضل موجودة عشان أي كود قديم بيستدعي isCloudinaryConfigured بالغلط ياخد
// رسالة واضحة بدل undefined is not a function.
export function isCloudinaryConfigured() {
  throw new Error(
    "isCloudinaryConfigured() اتشالت — المشروع بقى شغّال بـ Bunny. استخدم isBunnyStreamConfigured/isBunnyStorageConfigured."
  );
}

// ---------------------------------------------------------------------------
// Bunny Stream (فيديو)
// ---------------------------------------------------------------------------

/**
 * بيعمل entry جديد للفيديو في مكتبة Bunny Stream (خطوة لازمة قبل أي رفع،
 * لازم تاخد videoId). الاستدعاء ده من السيرفر بس (بيستخدم الـ API key السري).
 *
 * @param {object} params
 * @param {string} params.title - عنوان الفيديو (بيظهر في لوحة Bunny وممكن نستخدمه كاسم الدرس)
 * @returns {Promise<{videoId: string}>}
 */
export async function createStreamVideo({ title }) {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;

  const res = await fetch(`${STREAM_API_BASE}/library/${libraryId}/videos`, {
    method: "POST",
    headers: {
      AccessKey: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ title: title || "untitled" }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`bunny_stream_create_failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return { videoId: data.guid };
}

/**
 * بيولّد توقيع TUS مؤقت عشان المتصفح يرفع الفيديو *مباشرة* لـ Bunny Stream
 * (نفس دور generateUploadSignature القديم بتاع Cloudinary).
 *
 * 🔒 SECURITY: التوقيع مربوط بـ videoId محدد سلفًا (اتعمل بالفعل في
 * createStreamVideo على السيرفر) ووقت صلاحية قصير — فمينفعش حد يستخدمه
 * يرفع فيديو مكان فيديو تاني أو بعد ما ينتهي وقته.
 *
 * @param {object} params
 * @param {string} params.videoId
 * @param {number} [params.expireSeconds=3600]
 */
export function generateStreamUploadAuthorization({ videoId, expireSeconds = 3600 }) {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  const expirationTime = Math.floor(Date.now() / 1000) + expireSeconds;

  // الصيغة الرسمية من توثيق Bunny Stream TUS authentication:
  // sha256(library_id + api_key + expiration_time + video_id)
  const signature = crypto
    .createHash("sha256")
    .update(`${libraryId}${apiKey}${expirationTime}${videoId}`)
    .digest("hex");

  return {
    uploadEndpoint: STREAM_TUS_ENDPOINT,
    libraryId,
    videoId,
    authorizationSignature: signature,
    authorizationExpire: expirationTime,
  };
}

/**
 * رابط تشغيل الفيديو النهائي (iframe embed player من Bunny — شغّال على طول
 * من غير ما نحتاج نضبط pull zone/CDN hostname بتاعنا). لازم يتحط جوه
 * <iframe src={videoUrl} ...> عند بناء صفحة مشاهدة الدرس.
 */
export function buildStreamPlaybackUrl(videoId) {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
}

// ---------------------------------------------------------------------------
// Bunny Storage (صور + PDF)
// ---------------------------------------------------------------------------

/**
 * بيرفع ملف (Buffer/Stream) لـ Bunny Storage عن طريق السيرفر (proxy).
 * بيتنادى من /api/upload/file بعد ما requireRole يتحقق إن اللي بيرفع
 * teacher/admin فعلاً.
 *
 * @param {object} params
 * @param {string} params.path - المسار جوه الـ storage zone، مثلاً
 *   "edumaster/teachers/<userId>/images/<filename>"
 * @param {ReadableStream|Buffer} params.body - محتوى الملف
 * @param {string} [params.contentType]
 * @param {number} [params.contentLength] - لازم لو body عبارة عن stream (duplex upload)
 */
export async function uploadToStorage({ path, body, contentType, contentLength }) {
  const zone = process.env.BUNNY_STORAGE_ZONE_NAME;
  const accessKey = process.env.BUNNY_STORAGE_ACCESS_KEY;
  const regionHost = process.env.BUNNY_STORAGE_REGION_HOST || DEFAULT_STORAGE_REGION_HOST;

  const url = `https://${regionHost}/${zone}/${path}`;

  const headers = {
    AccessKey: accessKey,
    "Content-Type": contentType || "application/octet-stream",
  };
  if (contentLength) headers["Content-Length"] = String(contentLength);

  const res = await fetch(url, {
    method: "PUT",
    headers,
    body,
    duplex: "half", // مطلوب في Node لما بنبعت ReadableStream كـ body
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`bunny_storage_upload_failed: ${res.status} ${errText}`);
  }

  return { path, url: buildStoragePublicUrl(path) };
}

/** الرابط العام (عن طريق الـ Pull Zone/CDN) للملف بعد رفعه على Bunny Storage. */
export function buildStoragePublicUrl(path) {
  const pullZoneHost = process.env.BUNNY_STORAGE_PULL_ZONE_HOSTNAME;
  return `https://${pullZoneHost}/${path}`;
}
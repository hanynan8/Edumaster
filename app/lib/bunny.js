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
//
// 🔒 SECURITY (Day 62 audit): لحد دلوقتي buildStreamPlaybackUrl/
// buildStoragePublicUrl كانوا بيرجّعوا رابط عام دائم من غير أي توقيع —
// يعني حتى لو الـ API قفل صح مين ياخد الرابط (enrollment/membership)،
// أي حد ياخد الرابط ده (Network tab في المتصفح مثلاً) يقدر يشاركه ويشغله
// لحد الأبد من غير ما يكون طالب أو حتى عنده حساب أصلاً. اتضافت طبقة توقيع
// اختيارية (Token Authentication الرسمية من Bunny) فوق الروابط دي — رابط
// مؤقت بينتهي بعد ساعات قليلة، فمشاركته بره الموقع أو بعد انتهاء
// الاشتراك بتبقى قيمته صفر عمليًا. الميزة اختيارية بالكامل (fallback
// للرابط العام القديم لو الـ env vars الجديدة مش متظبطة) عشان متكسرش أي
// حد شغّال بإعداد قديم — بالظبط زي isBunnyStreamConfigured الموجودة.
//
// env vars إضافية (اختيارية):
//   BUNNY_STREAM_TOKEN_AUTH_KEY=   (من Bunny Dashboard → Stream → مكتبة
//     الفيديو → Security → Token Authentication Key، وبعد كده لازم تفعّل
//     "Token Authentication" toggle في نفس الصفحة عشان الحماية تشتغل فعليًا)
//   BUNNY_STORAGE_TOKEN_AUTH_KEY=  (من Bunny Dashboard → Pull Zone بتاعة
//     الـ Storage Zone → Security → Token Authentication Key، وكمان لازم
//     تفعّل الـ toggle بتاعها)

import crypto from "crypto";

// كام ثانية يفضل رابط الفيديو/الملف الموقّع صالح بعد ما نولّده. قصير
// كفاية إن مشاركة الرابط بره الموقع تبقى شبه من غير فايدة، وطويل كفاية
// إن الطالب يخلّص مشاهدة الدرس أو تحميل الملف من غير ما ينتهي في نص
// الطريق (الرابط بيتولّد من جديد في كل GET request أصلاً، مش مرة واحدة).
const SIGNED_URL_EXPIRE_SECONDS = 4 * 60 * 60; // 4 ساعات

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

export function isBunnyStreamTokenAuthConfigured() {
  return Boolean(process.env.BUNNY_STREAM_TOKEN_AUTH_KEY);
}

/**
 * 🔒 نفس buildStreamPlaybackUrl بس برابط موقّع ومؤقت (Bunny "Embed View
 * Token Authentication" الرسمية): token = HEX(SHA256(security_key +
 * video_id + expires)). لازم "Token Authentication" يكون مفعّل من
 * Bunny Dashboard لمكتبة الفيديو دي، وإلا Bunny هترفض حتى الرابط المُوقّع
 * صح (الحماية بتتفعّل من عندهم، الرابط بس بيبعت الدليل).
 *
 * بيتولّد من جديد في كل مرة الدرس بيتقرا (مش بيتخزن)، عشان مدة الصلاحية
 * تبدأ من وقت المشاهدة الفعلي مش من وقت الرفع.
 *
 * لو BUNNY_STREAM_TOKEN_AUTH_KEY مش متظبط، بيرجع لنفس الرابط العام القديم
 * (buildStreamPlaybackUrl) — مفيش أي كسر لإعداد قائم من غير الـ env var دي.
 */
export function buildSecureStreamPlaybackUrl(videoId, { expireSeconds = SIGNED_URL_EXPIRE_SECONDS } = {}) {
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const securityKey = process.env.BUNNY_STREAM_TOKEN_AUTH_KEY;
  if (!securityKey) return buildStreamPlaybackUrl(videoId);

  const expires = Math.floor(Date.now() / 1000) + expireSeconds;
  const token = crypto
    .createHash("sha256")
    .update(`${securityKey}${videoId}${expires}`)
    .digest("hex");

  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}`;
}

// بيستخرج videoId من رابط buildStreamPlaybackUrl (المُخزّن في lesson.videoUrl
// وقت الرفع) عشان نقدر نعيد توليد رابط موقّع منه وقت العرض — من غير ما
// نحتاج نضيف عمود جديد للموديل أو نعمل migration للبيانات القديمة.
export function extractBunnyStreamVideoId(playbackUrl) {
  if (typeof playbackUrl !== "string") return null;
  const m = playbackUrl.match(/\/embed\/\d+\/([0-9a-fA-F-]+)/);
  return m ? m[1] : null;
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

export function isBunnyStorageTokenAuthConfigured() {
  return Boolean(process.env.BUNNY_STORAGE_TOKEN_AUTH_KEY);
}

/**
 * 🔒 نسخة موقّعة ومؤقتة من buildStoragePublicUrl (Bunny CDN "URL Token
 * Authentication" الرسمية): token = base64url(MD5(security_key + path +
 * expires)). زي buildSecureStreamPlaybackUrl بالظبط لكن للـ PDF/الصور —
 * لازم "Token Authentication" مفعّل من إعدادات الـ Pull Zone بتاعة الـ
 * storage zone في Bunny Dashboard.
 *
 * لو BUNNY_STORAGE_TOKEN_AUTH_KEY مش متظبط، بيرجع لنفس الرابط العام القديم.
 */
export function buildSecureStoragePublicUrl(path, { expireSeconds = SIGNED_URL_EXPIRE_SECONDS } = {}) {
  const securityKey = process.env.BUNNY_STORAGE_TOKEN_AUTH_KEY;
  if (!securityKey) return buildStoragePublicUrl(path);

  const urlPath = path.startsWith("/") ? path : `/${path}`;
  const expires = Math.floor(Date.now() / 1000) + expireSeconds;

  const rawHash = crypto
    .createHash("md5")
    .update(`${securityKey}${urlPath}${expires}`)
    .digest("base64");
  const token = rawHash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const pullZoneHost = process.env.BUNNY_STORAGE_PULL_ZONE_HOSTNAME;
  return `https://${pullZoneHost}${urlPath}?token=${token}&expires=${expires}`;
}

// بيستخرج path الملف من رابط buildStoragePublicUrl (المُخزّن في
// lesson.fileUrl وقت الرفع) عشان نقدر نعيد توليد رابط موقّع منه وقت
// العرض، من غير migration للبيانات القديمة.
export function extractBunnyStoragePath(publicUrl) {
  if (typeof publicUrl !== "string") return null;
  const pullZoneHost = process.env.BUNNY_STORAGE_PULL_ZONE_HOSTNAME;
  if (!pullZoneHost) return null;
  const prefix = `https://${pullZoneHost}/`;
  if (!publicUrl.startsWith(prefix)) return null;
  return publicUrl.slice(prefix.length - 1); // سايبين الـ "/" الأول
}

/**
 * 🔒 SECURITY FIX: نفس فكرة resolveSecureLessonMediaUrls لكن لأي رابط
 * مُخزّن مفرد من Bunny Storage (مش بس videoUrl/fileUrl بتوع الدرس) — أهم
 * استخدام حاليًا: صورة البروفايل (avatar). المشكلة اللي حلّها الهيلبر ده:
 * لما "Token Authentication" يتفعّل على الـ Pull Zone من لوحة Bunny (بغض
 * النظر عن env vars عندنا)، أي رابط بيتخزن عادي (buildStoragePublicUrl)
 * ومن غير توقيع بيترجع 403 Forbidden من Bunny مباشرة — ده اللي كان بيسبب
 * "الصورة بتحمل وفي الآخر بتطلع بايظة".
 *
 * الحل: بنخزّن الرابط العادي زي ما هو في الداتابيز (دايمًا، عشان الرابط
 * الموقّع بينتهي بعد ساعات — لو خزّناه هو اللي هيبوظ لاحقًا)، وكل مرة
 * الرابط ده بيتبعت للعميل (session، /api/profile...) بنولّد توقيع طازة
 * له في اللحظة دي بالظبط عن طريق الدالة دي. لو Token Authentication مش
 * مفعّل من الأساس (BUNNY_STORAGE_TOKEN_AUTH_KEY مش متظبط)، بترجع الرابط
 * زي ما هو من غير أي تغيير — مفيش أي تأثير على إعداد قديم شغّال.
 *
 * @param {string|null|undefined} storedUrl - الرابط المخزّن في الداتابيز
 */
export function resolveSecureStoredUrl(storedUrl) {
  if (!storedUrl) return storedUrl ?? null;
  if (!isBunnyStorageTokenAuthConfigured()) return storedUrl;
  const path = extractBunnyStoragePath(storedUrl);
  if (!path) return storedUrl; // رابط مش من Bunny Storage بتاعنا (مثلاً placehold.co) — نسيبه زي ما هو
  return buildSecureStoragePublicUrl(path);
}

/**
 * 🔒 نقطة واحدة تستخدمها كل route بيسرّب محتوى درس (videoUrl/fileUrl):
 * بتاخد القيم المخزّنة زي ما هي وترجّع نسخة موقّعة ومؤقتة لو ممكن، وتسيب
 * أي حاجة تانية (يوتيوب/فيميو/رابط خارجي عمومًا) زي ما هي — إحنا بس اللي
 * نقدر نوقّع روابط Bunny بتاعتنا، روابط مزوّدين خارجيين مش تحت سيطرتنا.
 */
export function resolveSecureLessonMediaUrls({ videoUrl, videoProvider, fileUrl }) {
  let secureVideoUrl = videoUrl;
  if (videoUrl && videoProvider === "bunny" && isBunnyStreamTokenAuthConfigured()) {
    const videoId = extractBunnyStreamVideoId(videoUrl);
    if (videoId) secureVideoUrl = buildSecureStreamPlaybackUrl(videoId);
  }

  let secureFileUrl = fileUrl;
  if (fileUrl && isBunnyStorageTokenAuthConfigured()) {
    const path = extractBunnyStoragePath(fileUrl);
    if (path) secureFileUrl = buildSecureStoragePublicUrl(path);
  }

  return { videoUrl: secureVideoUrl, fileUrl: secureFileUrl };
}
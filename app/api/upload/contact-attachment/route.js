// app/api/upload/contact-attachment/route.js
//
// 🆕 راوت مخصص لملف مرفق (اختياري) في فورم الكونتاكت العام (SimpleInquiryForm
// في app/(pages)/contact/page.jsx). مختلف عمدًا عن /api/upload/file:
//
//   - /api/upload/file محتاج requireSession (teacher/student/admin) — مش
//     مناسب هنا لأن زوار الموقع اللي بيبعتوا فورم الكونتاكت غالبًا مش
//     مسجّلين دخول أصلاً.
//   - هنا الرفع عام (زي POST /api/data?collection=form بالظبط)، فبنعتمد
//     على rate limiting بالـ IP بس (بدل user id) لمنع سبام الرفع، وبنحصر
//     الأنواع المسموحة والحجم الأقصى أضيق شوية من الأنواع التانية عشان ده
//     endpoint مجهول الهوية (أي حد على الإنترنت يقدر يستدعيه).
//
// الملف بيتخزن على Bunny Storage (نفس الخدمة المستخدمة في باقي المشروع —
// app/lib/bunny.js) تحت مسار عام منفصل عن ملفات المدرسين/الطلاب:
//   edumaster/public/contact-attachments/<timestamp>-<اسم-الملف>
//
// الرابط اللي بيرجع من هنا هو اللي بيتحط في حقل attachmentUrl وقت إرسال
// POST /api/data?collection=form (شوف validateFormPayload في
// app/api/data/route.js).

import { uploadToStorage, isBunnyStorageConfigured, resolveSecureStoredUrl } from "@/app/lib/bunny";
import { enforceRateLimit } from "@/app/lib/rateLimit";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// 🔒 نفس فلسفة isSvgMime/isImageMime في /api/upload/file — بنستثني SVG
// صراحة حتى لو معلن كـ image/* (احتمال XSS مخزّن لو اتفتح مباشر).
function isSvgMime(mime) {
  return /image\/svg(\+xml)?/i.test(mime);
}
function isImageMime(mime) {
  return mime.startsWith("image/") && !isSvgMime(mime);
}

// 🔒 الأنواع المسموحة لمرفق فورم الكونتاكت: صور + PDF + Word — كافية لأي
// مستند داعم طبيعي (سيرة ذاتية، صورة جواز سفر، شهادة...) من غير ما نوسّع
// السطح المسموح بيه لملفات أخطر (zip مثلًا) على endpoint مجهول الهوية.
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function isAllowedMime(mime) {
  return isImageMime(mime) || ALLOWED_MIME_TYPES.has(mime);
}

// 5MB كافية جدًا لأي مستند/صورة داعمة لفورم كونتاكت (مش رفع فيديو أو أرشيف ضخم).
const MAX_BYTES = 5 * 1024 * 1024;

// 🔒 فحص magic bytes للأنواع اللي عندها توقيع ملف معروف — نفس منطق
// /api/upload/file/route.js (نسخة مختصرة هنا لأنواع الملفات المسموحة بس).
const MAGIC_BYTES = [
  { mime: "image/jpeg", check: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", check: (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/gif", check: (b) => b.length >= 6 && b.toString("ascii", 0, 6).match(/^GIF8[79]a$/) },
  {
    mime: "image/webp",
    check: (b) => b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
  },
  { mime: "application/pdf", check: (b) => b.length >= 4 && b.toString("ascii", 0, 4) === "%PDF" },
];

function magicBytesMatch(buffer, mime) {
  const rule = MAGIC_BYTES.find((r) => r.mime === mime);
  // .doc/.docx بتبقى ملفات ZIP-based (أو OLE قديم) بدون توقيع بسيط مميز —
  // زي ما هو متبع في /api/upload/file، منسيبش الفحص يفشل الرفع بالغلط.
  if (!rule) return true;
  return rule.check(buffer);
}

function safeFileName(originalName) {
  const base = (originalName || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
  return `${Date.now()}-${base}`;
}

export async function POST(request) {
  try {
    if (!isBunnyStorageConfigured()) {
      return jsonResponse({ error: "upload_not_configured" }, 503);
    }

    // 🔒 SECURITY: endpoint عام بدون تسجيل دخول → rate limit بالـ IP فقط.
    // 8 رفعات/دقيقة كافية جدًا لأي زائر حقيقي بيرفع مرفق واحد لفورم واحد،
    // ومحدودة كفاية إنها متبقاش باب لاستنزاف تخزين Bunny بالسبام.
    const rl = await enforceRateLimit(request, {
      keyPrefix: "upload:contact-attachment",
      limit: 8,
      windowSeconds: 60,
    });
    if (rl) return rl;

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      return jsonResponse({ error: "file_required" }, 400);
    }

    const mime = file.type || "application/octet-stream";
    if (!isAllowedMime(mime)) {
      return jsonResponse({ error: "invalid_mime", mime }, 400);
    }
    if (file.size > MAX_BYTES) {
      return jsonResponse({ error: "file_too_large", maxBytes: MAX_BYTES }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (!magicBytesMatch(buffer, mime)) {
      return jsonResponse({ error: "file_content_mismatch" }, 400);
    }

    // 🔒 مسار عام ثابت — مفيش أي جزء منه جاي من الـ client غير اسم الملف
    // (وده بيتعقّم في safeFileName)، فمفيش path traversal ممكن.
    const path = `edumaster/public/contact-attachments/${safeFileName(file.name)}`;

    const { url } = await uploadToStorage({ path, body: buffer, contentType: mime });

    return jsonResponse({
      url: resolveSecureStoredUrl(url),
      name: file.name || null,
      bytes: file.size,
      format: mime,
    });
  } catch (err) {
    console.error("[/api/upload/contact-attachment] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
// app/api/upload/file/route.js
//
// راوت جديد (Bunny): رفع الصور والـ PDF. على عكس الفيديو (اللي بيروح على
// طول لـ Bunny Stream بتوقيع TUS من المتصفح)، Bunny Storage مش بيدعم
// signed/scoped tokens — فالملف لازم يعدي هنا الأول عشان نتحقق من
// الصلاحية (teacher/admin) قبل ما نعمل proxy للرفع بمفتاح Bunny السري
// (اللي السيرفر بس عارفه). الصور والـ PDF غالبًا صغيرة نسبيًا فمش متوقع
// تصطدم بحدود body size اللي كانت المشكلة الأساسية مع الفيديو.

import { requireSession } from "@/app/lib/rbac";
import { uploadToStorage, isBunnyStorageConfigured } from "@/app/lib/bunny";
import { enforceRateLimit } from "@/app/lib/rateLimit";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// 🔒 SECURITY: SVG بيُعرض في المتصفح كـ document حي، وممكن يحتوي على
// <script> أو event handlers (onload, onerror...) — أي مكان بيسمح برفع
// "image/*" ويعرض الرابط بعد كده (حتى لو React مش بيعمل render مباشر
// للمحتوى) بيبقى فيه احتمال XSS مخزّن لو المستخدم فتح ملف الـ SVG مباشرة
// في تاب جديد أو اتحط جوه <img>/<object>/<iframe> في مكان تاني. فبنستثنيه
// صراحة من كل الأنواع اللي بتقبل "image/*".
function isSvgMime(mime) {
  return /image\/svg(\+xml)?/i.test(mime);
}
function isImageMime(mime) {
  return mime.startsWith("image/") && !isSvgMime(mime);
}

// 🔒 نوع الملف بيحدد الفولدر ونوع الـ content المسموح بيه.
//
// Phase 4 — اليوم 39-40: ضيفنا "submission" عشان الطالب يقدر يرفع ملف
// تسليم واجب (PDF/Word/Zip/صورة) — الأنواع التانية (image/pdf) لسه مقصورة
// على المدرس/الأدمن (رفع مرفقات الدروس/الواجبات نفسها).
const ALLOWED_KINDS = {
  image: { subfolder: "images", allowedMime: (m) => isImageMime(m), roles: ["teacher", "admin"] },
  pdf: { subfolder: "files", allowedMime: (m) => m === "application/pdf", roles: ["teacher", "admin"] },
  submission: {
    subfolder: "submissions",
    allowedMime: (m) =>
      [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
        "application/x-zip-compressed",
      ].includes(m) || isImageMime(m),
    roles: ["student", "teacher", "admin"],
  },
};

// 🔒 SECURITY: file.type جاي من المتصفح ومُعلَن ذاتيًا — أي حد يقدر يزوّره
// بسهولة (يرفع .html ويسميه صورة بامتداد .jpg ويبعت header مزوّر). بنتأكد
// من أول بايتات الملف الفعلية (magic bytes) بتطابق نوعه المُعلَن، كطبقة
// دفاع إضافية فوق فحص الـ MIME، مش بديل عنه.
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
  // لو مفيش قاعدة معروفة للنوع ده (زي .docx/.zip اللي هي أصلًا ZIP-based
  // ومتشابهة كتير في الهيدر)، منسيبش الفحص يفشل الرفع بالغلط — بنكتفي
  // بفحص الـ MIME المعلن + الامتداد زي ما هو. الفحص هنا إضافي مش حصري.
  if (!rule) return true;
  return rule.check(buffer);
}

const MAX_BYTES_BY_KIND = {
  image: 15 * 1024 * 1024, // 15MB
  pdf: 50 * 1024 * 1024, // 50MB
  submission: 25 * 1024 * 1024, // 25MB
};

function safeFileName(originalName) {
  const base = (originalName || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
  return `${Date.now()}-${base}`;
}

export async function POST(request) {
  try {
    if (!isBunnyStorageConfigured()) {
      return jsonResponse({ error: "upload_not_configured" }, 503);
    }

    const auth = await requireSession();
    if (auth.response) return auth.response;
    const { session } = auth;

    // 🔒 SECURITY (Day 59): كل رفعة بتستهلك bandwidth وتخزين حقيقي على
    // Bunny — 20 رفعة/دقيقة لكل مستخدم كافية جدًا لأي استخدام طبيعي (حتى
    // رفع دفعة ملفات) ومنع استنزاف التخزين بسبام رفع.
    const rl = await enforceRateLimit(request, {
      keyPrefix: "upload:file",
      limit: 20,
      windowSeconds: 60,
      extraKey: `user:${session.user.id}`,
    });
    if (rl) return rl;

    const formData = await request.formData().catch(() => null);
    const kind = formData?.get("kind");
    const file = formData?.get("file");

    if (!ALLOWED_KINDS[kind]) {
      return jsonResponse({ error: "invalid_kind", allowed: Object.keys(ALLOWED_KINDS) }, 400);
    }
    // 🔒 كل "kind" عنده الـ roles المسموحلها ترفعه — الطالب مثلاً يقدر
    // يرفع "submission" بس، مش "pdf"/"image" (دول لمرفقات المدرس فقط).
    if (!ALLOWED_KINDS[kind].roles.includes(session.user.role)) {
      return jsonResponse({ error: "forbidden" }, 403);
    }
    if (!file || typeof file.arrayBuffer !== "function") {
      return jsonResponse({ error: "file_required" }, 400);
    }

    const { subfolder, allowedMime } = ALLOWED_KINDS[kind];
    const mime = file.type || "application/octet-stream";
    if (!allowedMime(mime)) {
      return jsonResponse({ error: "invalid_mime", mime }, 400);
    }
    if (file.size > MAX_BYTES_BY_KIND[kind]) {
      return jsonResponse({ error: "file_too_large", maxBytes: MAX_BYTES_BY_KIND[kind] }, 400);
    }

    // 🔒 المسار مبني من بيانات معروفة عندنا بس (role + id المستخدم + نوع
    // الملف)، مش من أي path جاي من الـ client — كده مفيش path traversal
    // ولا يوزر يقدر يكتب في فولدر يوزر تاني.
    const roleFolder = session.user.role === "student" ? "students" : "teachers";
    const path = `edumaster/${roleFolder}/${session.user.id}/${subfolder}/${safeFileName(file.name)}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // 🔒 فحص إضافي: تأكيد إن محتوى الملف الفعلي متطابق مع الـ MIME المُعلَن،
    // مش بس الاعتماد على file.type اللي المتصفح بيبعته (وممكن يتزوّر).
    if (!magicBytesMatch(buffer, mime)) {
      return jsonResponse({ error: "file_content_mismatch" }, 400);
    }

    const { url } = await uploadToStorage({ path, body: buffer, contentType: mime });

    return jsonResponse({ url, bytes: file.size, format: mime });
  } catch (err) {
    console.error("[/api/upload/file] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
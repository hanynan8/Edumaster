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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// 🔒 نوع الملف بيحدد الفولدر ونوع الـ content المسموح بيه.
//
// Phase 4 — اليوم 39-40: ضيفنا "submission" عشان الطالب يقدر يرفع ملف
// تسليم واجب (PDF/Word/Zip/صورة) — الأنواع التانية (image/pdf) لسه مقصورة
// على المدرس/الأدمن (رفع مرفقات الدروس/الواجبات نفسها).
const ALLOWED_KINDS = {
  image: { subfolder: "images", allowedMime: (m) => m.startsWith("image/"), roles: ["teacher", "admin"] },
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
      ].includes(m) || m.startsWith("image/"),
    roles: ["student", "teacher", "admin"],
  },
};

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
    const { url } = await uploadToStorage({ path, body: buffer, contentType: mime });

    return jsonResponse({ url, bytes: file.size, format: mime });
  } catch (err) {
    console.error("[/api/upload/file] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
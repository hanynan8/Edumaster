// app/api/upload/signature/route.js
//
// اليوم 9: بيولّد توقيع Cloudinary مؤقت عشان الـ client يرفع فيديو/PDF/صورة
// *مباشرة* من المتصفح بدون ما الملف يعدي على سيرفرنا (شوف شرح القرار في
// app/lib/cloudinary.js). الراوت ده هو نقطة التحقق الوحيدة: أي حد يقدر
// يوصله (teacher/admin بس) يقدر ياخد توقيع، وأي حد تاني (حتى لو عرف رابط
// Cloudinary الأساسي) مش هيقدر يرفع حاجة من غير توقيع صالح.

import { requireRole } from "@/app/lib/rbac";
import { generateUploadSignature, isCloudinaryConfigured } from "@/app/lib/cloudinary";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// 🔒 نوع الملف بيحدد resourceType في Cloudinary. الـ raw بتُستخدم للـ PDF.
const ALLOWED_KINDS = {
  video: { resourceType: "video", subfolder: "videos" },
  image: { resourceType: "image", subfolder: "images" },
  pdf: { resourceType: "raw", subfolder: "files" },
};

export async function POST(request) {
  try {
    if (!isCloudinaryConfigured()) {
      return jsonResponse({ error: "upload_not_configured" }, 503);
    }

    const auth = await requireRole(["teacher", "admin"]);
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = await request.json().catch(() => null);
    const kind = body?.kind;
    if (!ALLOWED_KINDS[kind]) {
      return jsonResponse({ error: "invalid_kind", allowed: Object.keys(ALLOWED_KINDS) }, 400);
    }

    // 🔒 الفولدر مبني من بيانات معروفة عندنا بس (id المستخدم + نوع الملف)،
    // مش من أي string جاي من الـ client — كده مفيش path traversal ولا مدرس
    // يقدر يرفع في فولدر مدرس تاني.
    const { subfolder, resourceType } = ALLOWED_KINDS[kind];
    const folder = `edumaster/teachers/${session.user.id}/${subfolder}`;

    const signaturePayload = generateUploadSignature({ folder });

    return jsonResponse({ ...signaturePayload, resourceType });
  } catch (err) {
    console.error("[/api/upload/signature] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
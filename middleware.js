// middleware.js
//
// ⚠️ النسخة القديمة هنا كانت فيها ثغرة: كانت بتتحقق من x-api-secret، لكن
// لو الطلب مفيهوش الهيدر الصح، بدل ما ترفضه كانت بتضيف الـ secret الصح
// تلقائيًا وتكمّل الطلب عادي (fail-open) — يعني عمليًا مكانت بترفض أي حاجة
// خالص. وكمان الـ route نفسه (app/api/data/route.js) مكانش بيقرا الهيدر ده
// أصلاً، فالفحص كله كان بدون أي تأثير حقيقي، بيدّي إحساس أمان وهمي بس.
//
// الحماية الحقيقية لـ /api/data موجودة فعليًا جوه الراوت نفسه: كولكشن
// "auth" ممنوع تمامًا، والقراءة/الكتابة الحساسة محمية بفحص session role
// admin فعلي على السيرفر (getServerSession)، وفيه rate limiting على
// POST /form. فمفيش داعي لطبقة x-api-secret دي أصلاً — شلناها بدل ما نسيبها
// تدّي انطباع غلط بحماية مش موجودة.
//
// 🔒 SECURITY: بدل الفحص الوهمي، الميدل وير دلوقتي بيضيف Security headers
// أساسية على كل الردود (مش بس /api/data) — دي إضافة آمنة 100% ومش بتقيّد
// أي functionality في الموقع (مفيش CSP قد يكسر سكريبتات/صور خارجية، مفيش
// تعديل على الطلب نفسه أو الهيدرز اللي بتوصل للراوت).
import { NextResponse } from "next/server";

export function middleware(request) {
  const response = NextResponse.next();

  // يمنع تحميل الموقع جوه <iframe> في دومين تاني (clickjacking protection)
  response.headers.set("X-Frame-Options", "SAMEORIGIN");

  // يمنع المتصفح من "تخمين" نوع الملف بدل ما يلتزم بـ Content-Type المُعلن
  // (بيقلل خطر تنفيذ ملفات كـ HTML/JS لو حد رفعها كـ نوع تاني)
  response.headers.set("X-Content-Type-Options", "nosniff");

  // يقلل تسريب الـ URL الكامل بتاع الصفحة الحالية لمواقع خارجية عن طريق
  // هيدر Referer عند الضغط على لينك خارجي
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // يمنع الموقع من طلب صلاحيات كاميرا/مايك/موقع جغرافي حتى لو حصل XSS
  // بطريقة ما — الموقع مش محتاج أي صلاحية من دول أصلًا
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // HSTS: يجبر المتصفح يستخدم HTTPS بس مع الدومين ده لمدة سنة. Vercel أصلاً
  // بيفرض HTTPS، فالهيدر ده تأكيد إضافي مش تغيير سلوك.
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  return response;
}

// بيشتغل على كل الصفحات والـ API routes، وبيستثني ملفات Next الثابتة
// (_next/static, _next/image) والـ favicon عشان منزودش overhead من غير داعي.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
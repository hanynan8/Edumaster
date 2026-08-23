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
import { getToken } from "next-auth/jwt";

// 🔒 SECURITY: حماية على مستوى الصفحات (redirect للصفحة الرئيسية لو مفيش
// صلاحية) — دي طبقة دفاع إضافية (defense-in-depth) قبل ما الصفحة أصلاً
// تحمّل، مش بديل عن الفحص داخل كل API route (rbac.js) ولا داخل صفحة الأدمن
// نفسها. أي مسار يبدأ بالـ prefix ده لازم يكون المستخدم مسجل دخول بـ role
// من ضمن roles المذكورة، وإلا يتحول لصفحة تانية.
//
// 🆕 /student بقى مقصور على role="student" بس (كان قبل كده مسموح لـ
// teacher/admin كمان يشوفوا "كورساتي" لو مسجلين في كورس). لو أدمن حاول
// يدخل /student بيترحّل لـ /admin، ولو مدرس حاول بيترحّل لـ /teacher —
// عن طريق redirectByRole (بدل الـ "/" العام الافتراضي لباقي الحالات).
const PAGE_ROLE_RULES = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/teacher", roles: ["teacher", "admin"] },
  {
    prefix: "/student",
    roles: ["student"],
    redirectByRole: { admin: "/admin", teacher: "/teacher" },
  },
  // 🆕 /onboarding: خطوات "أول مرة" بعد التسجيل مباشرة — أي مستخدم مسجل
  // دخول (أي role) يقدر يوصلها، المهم بس إنه يكون عامل login أصلًا. غير
  // مسجل دخول → بيترحّل لـ "/" زي باقي الحالات (مفيش redirectByRole هنا).
  { prefix: "/onboarding", roles: ["student", "teacher", "admin"] },
  // 🆕 /meet: صفحة المحاضرات اللايف (روابط Daily). زي /onboarding بالظبط —
  // أي role مسجل دخول يقدر يوصلها (الفحص الفعلي لـ"مين شايف اجتماع مين"
  // بيتم داخل GET /api/meetings حسب الـ role، مش هنا).
  { prefix: "/meet", roles: ["student", "teacher", "admin"] },
];

// نفس المنطق لكن لمسارات الـ API — بترجع 401/403 JSON بدل redirect، عشان
// fetch/axios من الـ client يقدر يتعامل مع الخطأ صح بدل ما ياخد صفحة HTML.
// ⚠️ ده تكرار مقصود (defense-in-depth) لفحص requireRole() الموجود جوه كل
// route في app/lib/rbac.js — لو route جديد اتعمل ونسي المطور يحط
// requireRole()، الميدل وير ده بيغطيه لحد ما يتصلح.
const API_ROLE_RULES = [
  { prefix: "/api/admin", roles: ["admin"] },
  { prefix: "/api/teacher", roles: ["teacher", "admin"] },
];

function jsonError(status, error) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const isApiPath = pathname.startsWith("/api/");
  const rules = isApiPath ? API_ROLE_RULES : PAGE_ROLE_RULES;
  const matchedRule = rules.find((r) => pathname.startsWith(r.prefix));

  if (matchedRule) {
    // ⚠️ ملحوظة مهمة: getToken() بيفك تشفير كوكي الـ JWT الحالي زي ما هو،
    // من غير ما ينفّذ jwt() callback بتاع authOptions.js (اللي بيتحقق من
    // tokenVersion/status ضد الداتابيز). يعني لو الأدمن أوقف/عدّل صلاحية
    // مستخدم دلوقتي، الكوكي القديم هنا هيفضل شايل الـ role/status القديمة
    // لحد ما حاجة تانية (getServerSession/useSession) تعيد التحقق وتحدّث
    // الكوكي — بنفس نافذة الـ ~60 ثانية المشروحة في authOptions.js. الفحص
    // الصارم الفوري بيتم داخل كل route عن طريق requireRole() (rbac.js)
    // اللي بينادي getServerSession() فعليًا في كل طلب.
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
    });

    if (!token || token.invalid) {
      return isApiPath
        ? jsonError(401, "unauthorized")
        : NextResponse.redirect(new URL("/", request.url));
    }

    if (!matchedRule.roles.includes(token.role)) {
      if (isApiPath) return jsonError(403, "forbidden");
      const target = matchedRule.redirectByRole?.[token.role] || "/";
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

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

  // 🔒 SECURITY: Content-Security-Policy — طبقة دفاع إضافية ضد XSS (حتى لو
  // حصل بطريقة ما رغم عدم وجود dangerouslySetInnerHTML/eval في الكود
  // الحالي). النطاقات هنا مبنية فعليًا من النطاقات المستخدمة في المشروع:
  // Bunny (CDN + Stream player iframe)، Unsplash/placehold (صور)،
  // Google Fonts، و connect-src لـ PayPal API و Paymob Accept API (السيرفر
  // بينادي الاتنين من الباك اند مش من المتصفح فعليًا — الدفع بيتم عن طريق
  // redirect كامل بـ window.location.href لصفحة الدفع المستضافة عند
  // البوابة، مش SDK/iframe مضمّن جوه صفحتنا، فمفيش داعي لإضافة نطاق
  // paypal.com/paymob.com في script-src؛ frame-src مضاف لـ accept.paymob.com
  // للاحتياط بس (لو حصل تغيير مستقبلي لتضمين iframe بدل redirect كامل).
  //
  // 🔒 SECURITY FIX (F5 — security audit): كانت شغّالة بوضع Report-Only —
  // بتبعت تقارير بس من غير ما تمنع حاجة فعليًا. الـ directives هنا مبنية
  // من النطاقات الحقيقية اللي المشروع بيستخدمها فعلًا (Bunny, Unsplash/
  // placehold, Google Fonts, PayPal API), فمفيش سبب تفضل Report-Only —
  // اتحوّلت لوضع enforcing (اسم الهيدر بقى "Content-Security-Policy" بدل
  // "-Report-Only"). لو ظهرت مشاكل تحميل بعد الديبلوي (سكريبت/صورة/خط
  // اتمنع)، ضيف النطاق الناقص للـ directive المناسبة بدل الرجوع لـ
  // Report-Only بالكامل.
  // 🔒 SECURITY FIX: في وضع development، React DevTools/Turbopack بيحتاجوا
  // eval() لأدوات الديبج (زي إعادة بناء الـ call stack). ده مش موجود خالص
  // في production build، فبنضيف 'unsafe-eval' لـ script-src بس لو
  // process.env.NODE_ENV !== "production"، عشان الحماية في الـ production
  // تفضل زي ما هي من غير أي تنازل.
  const isDev = process.env.NODE_ENV !== "production";

  const cspDirectives = [
    "default-src 'self'",
    // 'unsafe-inline' لسه لازمة لحد ما نراجع الـ inline styles/scripts
    // الموجودة فعليًا (لو فيه)؛ ننصح نشيلها تدريجيًا بعد المراقبة.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://*.b-cdn.net https://images.unsplash.com https://plus.unsplash.com https://placehold.co https://cdn.jsdelivr.net https://res.cloudinary.com https://raw.githubusercontent.com",
    "media-src 'self' https://*.b-cdn.net",
    "frame-src 'self' https://iframe.mediadelivery.net https://accept.paymob.com",
    "connect-src 'self' https://*.b-cdn.net https://video.bunnycdn.com https://api-m.paypal.com https://api-m.sandbox.paypal.com https://accept.paymob.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ];
  response.headers.set("Content-Security-Policy", cspDirectives.join("; "));

  return response;
}

// بيشتغل على كل الصفحات والـ API routes، وبيستثني ملفات Next الثابتة
// (_next/static, _next/image) والـ favicon عشان منزودش overhead من غير داعي.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
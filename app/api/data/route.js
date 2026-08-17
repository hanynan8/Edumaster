// app/api/data/route.js
//
// ==========================================================================
// نسخة مؤمّنة (Hardened) — كل التعديلات موضّحة بتعليقات تبدأ بـ "🔒 SECURITY:"
// ==========================================================================

import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { connectToMongo } from "@/app/lib/mongodb";

if (!globalThis._mongoModels) globalThis._mongoModels = {};

const schema = new mongoose.Schema({}, { strict: false, timestamps: true });

// 🔒 SECURITY: أسماء الكولكشنز المسموحة تتكون من حروف/أرقام/شرطة سفلية/شرطة فقط،
// وطولها محدود. ده بيمنع حد يبعت اسم كولكشن غريب (فيه نقط، $ ، مسافات، إلخ)
// يحاول يستغل سلوك mongoose/mongodb الغريب أو ينشئ كولكشنز عشوائية بكثرة (DoS).
const COLLECTION_NAME_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

function isValidCollectionName(name) {
  return typeof name === "string" && COLLECTION_NAME_REGEX.test(name);
}

function normalizeModelName(name) {
  return `Model_${String(name).replace(/[^a-zA-Z0-9]/g, "_")}`;
}

function getModelForCollection(collectionName) {
  const name = String(collectionName);
  if (globalThis._mongoModels[name]) return globalThis._mongoModels[name];

  const modelName = normalizeModelName(name);

  // ✅ لو الموديل ده كان متسجل قبل كده بسكيمة قديمة (قبل إضافة timestamps)، امسحه وسجله تاني بالسكيمة الجديدة
  const existing = mongoose.models[modelName];
  if (existing && !existing.schema.options.timestamps) {
    delete mongoose.models[modelName];
    if (mongoose.modelSchemas) delete mongoose.modelSchemas[modelName];
  }

  const Model = mongoose.models[modelName] || mongoose.model(modelName, schema, name);
  globalThis._mongoModels[name] = Model;
  return Model;
}

async function listCollections() {
  await connectToMongo();
  const cols = await mongoose.connection.db.listCollections().toArray();
  return cols
    .map((c) => c.name)
    .filter((n) => !n.startsWith("system."));
}

function jsonResponse(data, status = 200) {
  // 🔒 SECURITY: هيدرز أساسية بتقلل مخاطر MIME sniffing / caching حساس.
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}

// 🔒 SECURITY: حد أقصى لحجم الـ body (بالبايت) لمنع إرسال payloads ضخمة (DoS / abuse).
const MAX_BODY_BYTES = 100 * 1024; // 100KB كافية جدًا لأي فورم أو محتوى صفحة

async function parseBody(request) {
  try {
    const raw = await request.text();
    if (raw && raw.length > MAX_BODY_BYTES) {
      throw new Error("Payload too large");
    }
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function getSearchParams(request) {
  const url = new URL(request.url);
  return {
    collection: url.searchParams.get("collection"),
    id: url.searchParams.get("id"),
  };
}

// 🔒 SECURITY: منع NoSQL injection عبر مفاتيح خطيرة زي $where, $set, $gt...
// أو مفاتيح بتستخدم فيها نقطة (dot notation) اللي ممكن تلاعب فيها في المستندات المتداخلة،
// وكمان منع Prototype Pollution عبر __proto__ / constructor / prototype.
const DANGEROUS_KEY_PATTERN = /^\$|\.|^__proto__$|^constructor$|^prototype$/;

function isSafeKey(key) {
  return !DANGEROUS_KEY_PATTERN.test(key);
}

function sanitizeObject(obj, depth = 0) {
  if (depth > 5) throw new Error("Object nesting too deep");
  if (obj === null || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }

  const clean = {};
  for (const key of Object.keys(obj)) {
    if (!isSafeKey(key)) {
      throw new Error(`Invalid field name: ${key}`);
    }
    clean[key] = sanitizeObject(obj[key], depth + 1);
  }
  return clean;
}

// 🔒 SECURITY: أي بيانات جاية من العميل (حتى لو admin) بتتعقم قبل ما توصل لـ mongoose.
function safeSanitize(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    // احنا مستنيين object أو array of objects بس على مستوى أعلى
    return sanitizeObject(body);
  }
  return sanitizeObject(body);
}

// ⚠️ كولكشنز حساسة ممنوع تتعامل معها من الـ endpoint المفتوح ده خالص —
// أي قراءة أو كتابة عليها لازم تعدي من route محمي بصلاحيات حقيقية على السيرفر.
// "auth" فيها الباسوردات (ولو مشفرة) وممنوع أي حد يعرف يجيبها بمجرد ما يعرف اسم الكولكشن.
const PROTECTED_COLLECTIONS = new Set(["auth"]);

function isProtectedCollection(name) {
  return PROTECTED_COLLECTIONS.has(String(name));
}

// ✅ الكولكشنز الوحيدة المسموح فيها بالكتابة (POST) من غير تسجيل دخول admin —
// دي بيانات جايه من زوار الموقع نفسهم (زي فورم التواصل)، مش محتوى الموقع.
// أي كولكشن تاني (navbar, home, about, services, courses...) بيانات محتوى الموقع
// ولازم يتغير من لوحة الأدمن بس.
const PUBLIC_WRITE_COLLECTIONS = new Set(["form"]);

// ⚠️ الكولكشنز اللي ممنوع حد يقراها (GET) غير الأدمن —
// "form" فيها رسائل زوار الموقع (اسم/إيميل/رقم تليفون)، بيانات شخصية مش المفروض
// تكون متاحة للعامة حتى لو حد عرف اسم الكولكشن. الكتابة (POST) فيها لسه مسموحة
// للعامة عشان فورم التواصل يشتغل، لكن القراءة admin بس.
const ADMIN_READ_COLLECTIONS = new Set(["form"]);

function isAdminReadCollection(name) {
  return ADMIN_READ_COLLECTIONS.has(String(name));
}

// 🔒 SECURITY: مفيش أي fallback ثابت (زي "admin@gmail.com") تاني.
// لو ADMIN_EMAIL مش متظبطة في الـ env، الـ admin check هيرجع false دايمًا
// (يعني محدش يقدر يعمل حاجات admin) بدل ما يفتح ثغرة لأي حد يسجل بإيميل معروف.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
  ? process.env.ADMIN_EMAIL.toLowerCase()
  : null;

if (!ADMIN_EMAIL) {
  console.warn(
    "⚠️ ADMIN_EMAIL is not set — admin fallback via email is DISABLED. Only session role='admin' will grant admin access."
  );
}

// 🔒 SECURITY (Day 59 audit — CRITICAL): الـ endpoint العام ده الأصل كان
// مصمم بس لمحتوى الموقع التسويقي (navbar/home/about/services...)، لكن
// عمليًا كان بيسمح بقراءة (GET) *أي* كولكشن في الداتابيز من غير أي تسجيل
// دخول — بما فيهم collections حساسة جدًا زي "payments" و"enrollments" و
// "quiz_results" و"notifications" و"submissions" و"certificates"،
// لأن isAdminReadCollection() كانت بتتحقق من "form" بس. يعني أي حد يعرف
// اسم الكولكشن (سهل التخمين: /api/data?collection=payments) كان يقدر
// يشوف *كل* المدفوعات وكل نتائج الكويزات وكل التسليمات لكل المستخدمين.
//
// الحل: allowlist صريح لأسماء الكولكشنز المسموح قراءتها عامةً من هنا —
// نفس الكولكشنز اللي الفرونت فعليًا بيستخدمها من الـ endpoint ده (شوف
// app/admin/page.jsx handleExportAllData + صفحات الموقع العامة). أي
// كولكشن تاني (كل بيانات الـ LMS: enrollments, payments, quiz_results,
// submissions, notifications, certificates, comments...) لازم يتقرأ من
// route مخصص بيه RBAC حقيقي (زي app/api/enrollments، app/api/payments...)
// مش من هنا. الكتابة (POST/PUT/DELETE) أصلاً كانت محمية admin-only بالفعل
// (ما عدا "form" العام) — الثغرة كانت في القراءة العامة بس.
const PUBLIC_READ_COLLECTIONS = new Set([
  "home",
  "navbar",
  "footer",
  "about",
  "services",
  // 🔄 UNIFY: "courses" و"courses_landing" الاتنين متشالين من هنا نهائيًا.
  // مبقاش فيه "كورسات تسويقية" منفصلة عن الكورسات الحقيقية — كل كورس على
  // الموقع (بما فيهم أي كورس كان قبل كده تسويقي) بقى نفس الموديل بالظبط
  // (Course model، collection="courses_landing")، وبيتقرا للعامة من
  // GET /api/courses بس (فلترة status=published هناك) — شوف
  // app/api/courses/route.js وapp/lib/models/Course.js. أي محاولة قراءة
  // كورسات من هنا (collection=courses أو courses_landing) لازم تتنقل
  // لـ /api/courses، مش تتضاف تاني للـ allowlist دي.
  "countries",
  "blogs",
  "blog",
  "contact",
  "privacy",
  "successStories",
  "success_stories",
  "form", // القراءة هنا لسه بتتفحص admin-only في isAdminReadCollection تحت
]);

function isPublicReadCollection(name) {
  return PUBLIC_READ_COLLECTIONS.has(String(name));
}

async function isAdminRequest() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  const role = session?.user?.role;

  if (role === "admin") return true;
  if (ADMIN_EMAIL && email === ADMIN_EMAIL) return true;
  return false;
}

// 🔒 SECURITY: Rate limiting بسيط في الميموري لكل IP، بيطبق بس على POST /form
// (الـ endpoint المفتوح للعامة). ده مش بديل عن حماية على مستوى الـ edge/CDN
// (زي Cloudflare أو Vercel Firewall) لو متاحة، لكنه خط دفاع إضافي يمنع سبام سريع
// ويوفر Resend quota. ملحوظة: في بيئة serverless متعددة الـ instances الميموري
// مش مشتركة 100%، فلو محتاج ضمان أقوى استخدم Redis أو حل خارجي.
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // دقيقة
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 طلبات كحد أقصى في الدقيقة لكل IP
if (!globalThis._formRateLimit) globalThis._formRateLimit = new Map();

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = globalThis._formRateLimit.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    globalThis._formRateLimit.set(ip, { windowStart: now, count: 1 });
    return false;
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  return false;
}

// 🔒 SECURITY: تنظيف دوري بسيط لخريطة الـ rate limit عشان ما تكبرش من غير حدود
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of globalThis._formRateLimit.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 5) {
      globalThis._formRateLimit.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS * 5).unref?.();

// 🔒 SECURITY: تحقق أساسي من شكل بيانات الفورم قبل الحفظ/الإرسال بالإيميل —
// بيمنع حقن HTML ضخم أو نصوص عملاقة كـ "رسالة"، وبيتأكد إن الإيميل شكله سليم لو موجود.
const FORM_FIELD_MAX_LENGTHS = {
  name: 200,
  email: 254,
  phone: 40,
  service: 200,
  message: 5000,
};
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateFormPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Invalid form data";
  }
  for (const [field, maxLen] of Object.entries(FORM_FIELD_MAX_LENGTHS)) {
    const val = body[field];
    if (val !== undefined && val !== null) {
      if (typeof val !== "string") return `Field '${field}' must be a string`;
      if (val.length > maxLen) return `Field '${field}' is too long`;
    }
  }
  if (body.email && !SIMPLE_EMAIL_REGEX.test(body.email)) {
    return "Invalid email format";
  }
  return null; // valid
}

// ===== Resend Email Notification =====
// لازم تضيف المتغيرات دي في .env:
// RESEND_API_KEY=your_resend_api_key
// RESEND_FROM_EMAIL=onboarding@resend.dev  (أو دومين متحقق منه في Resend)
// RESEND_TO_EMAIL=hanynan8@gmail.com
const RESEND_API_KEY = process.env.RESEND_API_KEY;
// ⚠️ لازم دومين edumaster365 يكون متوثق (verified) في لوحة Resend عشان الإرسال من notifications@ يشتغل
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "notifications@edumaster365.com";
const RESEND_TO_EMAIL = process.env.RESEND_TO_EMAIL || "info@edumaster365.com";
// 🖼️ حط رابط اللوجو هنا مباشرة (لازم يكون رابط عام/مباشر للصورة، مش رابط صفحة)
const RESEND_LOGO_URL = "https://raw.githubusercontent.com/hanynan8/e-commerce/refs/heads/main/WhatsApp%20Image%202026-04-04%20at%2012.54.46%20PM.jpeg";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function notifyViaResend(data) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email notification");
    return;
  }

  try {
    const submittedAt = data?.createdAt ? new Date(data.createdAt) : new Date();
    const formattedDate = submittedAt.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const name = escapeHtml(data?.name);
    const email = escapeHtml(data?.email);
    const phone = escapeHtml(data?.phone);
    const service = escapeHtml(data?.service);
    const message = escapeHtml(data?.message);
    const logoUrl = RESEND_LOGO_URL;

    const row = (label, value) => `
                  <tr>
                    <td style="padding:14px 0;border-bottom:1px solid #dbeafe;" dir="ltr" align="left">
                      <div style="font-family:'DM Sans','Tajawal',Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#C9A227;margin-bottom:4px;">
                        ${label}
                      </div>
                      <div style="font-family:'DM Sans','Tajawal',Arial,Helvetica,sans-serif;font-size:15px;color:#1e293b;font-weight:600;line-height:1.5;">
                        ${value || "—"}
                      </div>
                    </td>
                  </tr>`;

    const mailtoRow = (label, value) => `
                  <tr>
                    <td style="padding:14px 0;border-bottom:1px solid #dbeafe;" dir="ltr" align="left">
                      <div style="font-family:'DM Sans','Tajawal',Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#C9A227;margin-bottom:4px;">
                        ${label}
                      </div>
                      <div style="font-family:'DM Sans','Tajawal',Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;">
                        ${value ? `<a href="mailto:${value}" style="color:#2563eb;font-weight:600;text-decoration:none;">${value}</a>` : "—"}
                      </div>
                    </td>
                  </tr>`;

    const html = `
<!DOCTYPE html>
<html dir="ltr" lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;900&family=Tajawal:wght@400;700;800&family=Great+Vibes&display=swap');
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#eef2ff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2ff;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:2px solid #dbeafe;">

            <!-- Header -->
            <tr>
              <td style="background-color:#1E3561;padding:24px 32px;" dir="ltr" align="left">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    ${logoUrl ? `
                    <td valign="middle" style="padding-right:16px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" style="border-radius:50%;width:56px;height:56px;">
                        <tr>
                          <td align="center" valign="middle" style="width:56px;height:56px;border-radius:50%;overflow:hidden;border:2px solid rgba(201,162,39,0.3);">
                            <img src="${logoUrl}" alt="Edumaster" width="56" height="56" style="display:block;width:56px;height:56px;border-radius:50%;object-fit:cover;border:0;" />
                          </td>
                        </tr>
                      </table>
                    </td>` : ""}
                    <td valign="middle" align="left">
                      <span style="font-family:'DM Sans','Tajawal',Arial,Helvetica,sans-serif;font-size:20px;font-weight:900;color:#C9A227;letter-spacing:0.5px;">
                        Edumaster
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="height:3px;background-color:#C9A227;line-height:0;font-size:0;">&nbsp;</td>
            </tr>

            <!-- Title -->
            <tr>
              <td style="padding:28px 32px 4px 32px;" dir="ltr" align="left">
                <div style="font-family:'DM Sans','Tajawal',Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C9A227;margin-bottom:8px;">
                  New Message
                </div>
                <div style="font-family:'DM Sans','Tajawal',Arial,Helvetica,sans-serif;font-size:20px;font-weight:900;color:#1e293b;">
                  You've received a new message from the Edumaster website
                </div>
              </td>
            </tr>

            <!-- Details -->
            <tr>
              <td style="padding:12px 32px 8px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${row("Name", name)}
                  ${mailtoRow("Email", email)}
                  ${row("Phone", phone)}
                  ${row("Requested Service", service)}
                  ${row("Message", message)}
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px 32px 24px 32px;" dir="ltr" align="left">
                <div style="font-family:'DM Sans','Tajawal',Arial,Helvetica,sans-serif;font-size:12px;color:#64748b;">
                  Submitted on ${formattedDate}
                </div>
              </td>
            </tr>

            <tr>
              <td style="background-color:#0a0a0a;padding:22px 32px;" dir="ltr" align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td valign="middle" style="padding-right:6px;">
                      <span style="font-family:'DM Sans','Tajawal',Arial,Helvetica,sans-serif;font-size:12px;color:#b3b3b3;letter-spacing:0.2px;">
                        Edumaster Website system. Developed by
                      </span>
                    </td>
                    <td valign="middle">
                      <span style="font-family:'Great Vibes',cursive;font-size:22px;color:#C9A227;line-height:1;">
                        ENG: Hany Younan
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [RESEND_TO_EMAIL],
        subject: "New Contact Form Submission — Edumaster",
        html,
        reply_to: data?.email || undefined,
      }),
    });

    // ✅ نسجل الرد كامل دايمًا، مش بس لما يفشل
    const resBody = await res.text();
    console.log("Resend response status:", res.status, res.ok);
    console.log("Resend response body:", resBody);

    if (!res.ok) {
      console.error("Resend notification failed:", resBody);
    }
  } catch (err) {
    console.error("Resend notification error:", err);
  }
}

// 🔒 SECURITY: دالة موحدة للتعامل مع الأخطاء — بترجع رسالة عامة للعميل
// وتسجل التفاصيل الكاملة في الـ server logs بس. ده بيمنع تسريب تفاصيل
// داخلية عن الداتابيز أو الكود (stack traces, نصوص errors من mongoose، إلخ)
// اللي ممكن تساعد مهاجم يفهم بنية النظام.
function handleError(err, context) {
  console.error(`[/api/data] ${context}:`, err);
  return jsonResponse({ error: "Internal server error" }, 500);
}

export async function GET(request) {
  try {
    await connectToMongo();
    const { collection, id } = getSearchParams(request);

    if (!collection) {
      // 🔒 SECURITY (Day 59): من غير ?collection=، برضه لازم نستبعد أي حاجة
      // مش في الـ allowlist العام — قبل كده كان بس بيستبعد "auth" و"form"
      // (لغير admin)، وكل باقي كولكشنز الداتابيز (حساسة أو لأ) كانت بترجع.
      const isAdmin = await isAdminRequest();
      const colNames = (await listCollections()).filter((n) => {
        if (isProtectedCollection(n)) return false;
        if (!isPublicReadCollection(n) && !isAdmin) return false;
        if (isAdminReadCollection(n) && !isAdmin) return false;
        return true;
      });

      const results = await Promise.all(
        colNames.map(async (name) => {
          const Model = getModelForCollection(name);
          return Model.find({});
        })
      );

      const payload = colNames.reduce((acc, name, idx) => {
        acc[name] = results[idx];
        return acc;
      }, {});

      return jsonResponse(payload, 200);
    }

    const colName = String(collection);

    // 🔒 SECURITY: التحقق من شكل اسم الكولكشن قبل أي استخدام له
    if (!isValidCollectionName(colName)) {
      return jsonResponse({ error: "Invalid collection name" }, 400);
    }

    if (isProtectedCollection(colName)) {
      return jsonResponse(
        { error: "This collection is protected. Use the dedicated API route instead." },
        403
      );
    }

    // 🔒 SECURITY (Day 59 — CRITICAL FIX): قبل كده الشرط الوحيد هنا كان
    // isAdminReadCollection (بيغطي "form" بس)، فأي كولكشن تاني — بما فيهم
    // "payments"، "enrollments"، "quiz_results"، "notifications"،
    // "submissions"، "certificates"، "comments" — كان يترجع لأي حد من غير
    // تسجيل دخول خالص. دلوقتي: لازم يكون في الـ allowlist العام، أو
    // المستخدم admin فعليًا.
    if (!isPublicReadCollection(colName)) {
      const authorized = await isAdminRequest();
      if (!authorized) {
        return jsonResponse({ error: "unauthorized" }, 401);
      }
    }

    // 🔒 SECURITY: منع قراءة "form" لغير الأدمن
    if (isAdminReadCollection(colName)) {
      const authorized = await isAdminRequest();
      if (!authorized) {
        return jsonResponse({ error: "unauthorized" }, 401);
      }
    }

    const existingCols = await listCollections();
    if (!existingCols.includes(colName)) {
      return jsonResponse({ error: `Collection '${colName}' not found` }, 404);
    }

    const Model = getModelForCollection(colName);

    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "Invalid id format" }, 400);
      const doc = await Model.findById(id).lean();
      if (!doc) return jsonResponse({ error: "Document not found" }, 404);
      return jsonResponse(doc, 200);
    }

    // ⚡ PERFORMANCE (Day 60): كان Model.find({}) من غير حد أقصى ولا .lean() —
    // لكولكشنز المحتوى دي غالبًا صغيرة، لكن حد أقصى + lean() دفاع رخيص ضد
    // أي كولكشن يكبر بالغلط مستقبلًا (ومفيش سبب نجيب Mongoose documents
    // كاملة لبيانات هترجع كـ JSON مباشرة على طول).
    const MAX_DOCS_RETURNED = 5000;
    const docs = await Model.find({}).limit(MAX_DOCS_RETURNED).lean();
    return jsonResponse(docs, 200);
  } catch (err) {
    return handleError(err, "GET");
  }
}

export async function POST(request) {
  try {
    await connectToMongo();
    const { collection } = getSearchParams(request);
    if (!collection) return jsonResponse({ error: "Collection is required" }, 400);

    const colName = String(collection);

    // 🔒 SECURITY: التحقق من شكل اسم الكولكشن
    if (!isValidCollectionName(colName)) {
      return jsonResponse({ error: "Invalid collection name" }, 400);
    }

    if (isProtectedCollection(colName)) {
      return jsonResponse(
        { error: "This collection is protected. Use /api/register instead." },
        403
      );
    }

    // ✅ أي كولكشن غير الموجودة في PUBLIC_WRITE_COLLECTIONS (زي "form") محتاجة
    // تسجيل دخول admin فعلي — عشان محتوى الموقع (navbar, home, about...) يتغير
    // من لوحة الأدمن بتاعتنا بس، مش من أي حد عارف اسم الكولكشن.
    const isPublicWrite = PUBLIC_WRITE_COLLECTIONS.has(colName);
    if (!isPublicWrite) {
      const authorized = await isAdminRequest();
      if (!authorized) {
        return jsonResponse({ error: "unauthorized" }, 401);
      }
    }

    // 🔒 SECURITY: rate limiting على الكتابة العامة (form) بس، لأنها الوحيدة
    // المتاحة من غير تسجيل دخول وبالتالي عرضة للسبام
    if (isPublicWrite) {
      const ip = getClientIp(request);
      if (isRateLimited(ip)) {
        return jsonResponse({ error: "Too many requests, please try again later" }, 429);
      }
    }

    const body = await parseBody(request);
    if (body === null) {
      return jsonResponse({ error: "Invalid or missing JSON body" }, 400);
    }

    // 🔒 SECURITY: تعقيم البيانات من أي مفاتيح خطيرة ($ operators, prototype pollution)
    let sanitizedBody;
    try {
      sanitizedBody = safeSanitize(body);
    } catch (e) {
      return jsonResponse({ error: e.message || "Invalid payload" }, 400);
    }

    // 🔒 SECURITY: تحقق إضافي مخصص لبيانات الفورم العام (طول الحقول، شكل الإيميل)
    if (isPublicWrite) {
      const validationError = Array.isArray(sanitizedBody)
        ? "Bulk submissions are not allowed for this collection"
        : validateFormPayload(sanitizedBody);
      if (validationError) {
        return jsonResponse({ error: validationError }, 400);
      }
    }

    const Model = getModelForCollection(colName);
    const now = new Date();

    if (Array.isArray(sanitizedBody)) {
      // 🔒 SECURITY: حد أقصى لعدد العناصر في insertMany لمنع bulk abuse
      const MAX_BULK_ITEMS = 200;
      if (sanitizedBody.length > MAX_BULK_ITEMS) {
        return jsonResponse({ error: "Too many items in a single request" }, 400);
      }
      const withDates = sanitizedBody.map((item) => ({
        ...item,
        createdAt: now,
        updatedAt: now,
      }));
      const created = await Model.insertMany(withDates);
      return jsonResponse(created, 201);
    } else {
      const dataWithDate = { ...sanitizedBody, createdAt: now, updatedAt: now };
      const created = await Model.create(dataWithDate);

      if (colName === "form") {
        await notifyViaResend(created); // ✅ Resend بدل Formspree
      }

      return jsonResponse(created, 201);
    }
  } catch (err) {
    return handleError(err, "POST");
  }
}

export async function PUT(request) {
  try {
    await connectToMongo();
    const { collection, id } = getSearchParams(request);
    if (!collection) return jsonResponse({ error: "Collection is required" }, 400);
    if (!id) return jsonResponse({ error: "ID is required for PUT" }, 400);
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "Invalid id format" }, 400);

    const colName = String(collection);

    if (!isValidCollectionName(colName)) {
      return jsonResponse({ error: "Invalid collection name" }, 400);
    }

    if (isProtectedCollection(colName)) {
      return jsonResponse({ error: "This collection is protected." }, 403);
    }

    // ✅ التعديل (PUT) دايمًا لازم admin — مفيش كولكشن فيها تعديل عام من زوار الموقع
    const authorized = await isAdminRequest();
    if (!authorized) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const existingCols = await listCollections();
    if (!existingCols.includes(colName)) return jsonResponse({ error: "Collection not found" }, 404);

    const Model = getModelForCollection(colName);

    const body = await parseBody(request);
    if (body === null) {
      return jsonResponse({ error: "Invalid or missing JSON body" }, 400);
    }

    // 🔒 SECURITY: تعقيم البيانات من أي مفاتيح خطيرة قبل الـ update
    // (ده مهم جدًا هنا لأن findByIdAndUpdate بيقبل update operators زي $set/$unset،
    // فلازم نتأكد إن مفيش حد بيبعت operators غريبة أو يحاول يعدل حقول نظامية).
    let sanitizedBody;
    try {
      sanitizedBody = safeSanitize(body);
    } catch (e) {
      return jsonResponse({ error: e.message || "Invalid payload" }, 400);
    }

    // 🔒 SECURITY: منع تعديل createdAt يدويًا، وتحديث updatedAt تلقائيًا فقط
    delete sanitizedBody.createdAt;
    sanitizedBody.updatedAt = new Date();

    const updated = await Model.findByIdAndUpdate(id, sanitizedBody, {
      new: true,
      runValidators: false,
      overwrite: false, // 🔒 SECURITY: تحديث جزئي فقط، مش استبدال المستند بالكامل
    });
    if (!updated) return jsonResponse({ error: "Document not found" }, 404);
    return jsonResponse(updated, 200);
  } catch (err) {
    return handleError(err, "PUT");
  }
}

export async function DELETE(request) {
  try {
    await connectToMongo();
    const { collection, id } = getSearchParams(request);
    if (!collection) return jsonResponse({ error: "Collection is required" }, 400);
    if (!id) return jsonResponse({ error: "ID is required for DELETE" }, 400);
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonResponse({ error: "Invalid id format" }, 400);

    const colName = String(collection);

    if (!isValidCollectionName(colName)) {
      return jsonResponse({ error: "Invalid collection name" }, 400);
    }

    if (isProtectedCollection(colName)) {
      return jsonResponse({ error: "This collection is protected." }, 403);
    }

    // ✅ الحذف (DELETE) دايمًا لازم admin — حتى مسح رسائل "form" لازم يتم من لوحة الأدمن بس
    const authorized = await isAdminRequest();
    if (!authorized) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const existingCols = await listCollections();
    if (!existingCols.includes(colName)) return jsonResponse({ error: "Collection not found" }, 404);

    const Model = getModelForCollection(colName);

    const deleted = await Model.findByIdAndDelete(id);
    if (!deleted) return jsonResponse({ error: "Document not found" }, 404);
    return jsonResponse(deleted, 200);
  } catch (err) {
    return handleError(err, "DELETE");
  }
}
// app/api/forgot-password/route.js
//
// الخطوة الأولى في نسيان الباسورد: المستخدم يبعت إيميله، لو موجود بنبعتله
// كود مكوّن من 6 أرقام على إيميله. بنخزن الـ hash بتاع الكود بس (مش الكود
// نفسه) في الداتابيز، بالظبط زي ما بنعامل الباسورد.

import bcrypt from "bcryptjs";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import {
  CODE_TTL_MS,
  ensureAttemptWindow,
  hasExceededAttempts,
} from "@/app/lib/resetPasswordHelpers";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 🔒 SECURITY: كود من 6 أرقام (000000-999999). مش سري بمفرده (بيتبعت
// بالإيميل)، اللي بيحدد الأمان الفعلي هو محدودية المحاولات (شوف
// resetPasswordHelpers: 5 محاولات كل 12 ساعة) + rate limiting الطلبات هنا.
function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// 🔒 SECURITY: rate limiting في الميموري لكل IP + لكل إيميل — يمنع سبام
// طلبات forgot-password (Resend quota + إزعاج المستخدم بإيميلات كتير).
// ده حماية ضد "إرسال أكواد كتير"، ومنفصل تمامًا عن حماية "تخمين الكود"
// (5 محاولات/12 ساعة) اللي بتفضل شغالة حتى لو المستخدم طلب أكواد جديدة.
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 3; // 3 طلبات كحد أقصى في الدقيقة لكل IP/إيميل
if (!globalThis._forgotPassRateLimit) globalThis._forgotPassRateLimit = new Map();

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(key) {
  const now = Date.now();
  const entry = globalThis._forgotPassRateLimit.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    globalThis._forgotPassRateLimit.set(key, { windowStart: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "notifications@edumaster365.com";

async function sendResetCodeEmail(toEmail, code, name) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping reset code email");
    return;
  }

  const html = `
<!DOCTYPE html>
<html dir="ltr" lang="en">
  <body style="margin:0;padding:0;background-color:#eef2ff;font-family:'DM Sans',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2ff;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;border:2px solid #dbeafe;">
          <tr><td style="background-color:#1E3561;padding:24px 32px;">
            <span style="font-size:20px;font-weight:900;color:#C9A227;">Edumaster</span>
          </td></tr>
          <tr><td style="height:3px;background-color:#C9A227;line-height:0;font-size:0;">&nbsp;</td></tr>
          <tr><td style="padding:32px;">
            <p style="font-size:15px;color:#1e293b;margin:0 0 8px 0;">
              Hi ${name ? name.replace(/</g, "&lt;") : ""},
            </p>
            <p style="font-size:14px;color:#64748b;margin:0 0 24px 0;">
              Use the code below to reset your password. It expires in 15 minutes.
            </p>
            <div style="text-align:center;padding:20px;background:#f8fafc;border-radius:12px;border:1px dashed #C9A227;">
              <span style="font-size:32px;font-weight:900;letter-spacing:8px;color:#1E3561;">${code}</span>
            </div>
            <p style="font-size:12px;color:#94a3b8;margin-top:24px;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [toEmail],
      subject: "Your Edumaster password reset code",
      html,
    }),
  });

  if (!res.ok) {
    console.error("Resend reset-code email failed:", await res.text());
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      return jsonResponse({ error: "invalid_email" }, 400);
    }

    const ip = getClientIp(request);
    if (isRateLimited(`ip:${ip}`) || isRateLimited(`email:${email}`)) {
      return jsonResponse({ error: "too_many_requests" }, 429);
    }

    await connectToMongo();
    const AuthModel = getAuthModel();
    const user = await AuthModel.findOne({ email });

    // 🔒 SECURITY: نرجع نفس الرد سواء الإيميل موجود أو لأ — عشان مانديش
    // لأي حد فرصة يعرف مين مسجل في الموقع ومين لأ (user enumeration).
    if (user) {
      // 🔒 SECURITY: لو المستخدم خلّص محاولاته الـ 5 خلال آخر 12 ساعة، مانبعتش
      // كود جديد خالص — إرسال كود جديد كان هيدّي فرصة إضافية للمهاجم يستمر
      // في التخمين. ⚠️ ملحوظة: الرد هنا بيرجع 429 مميز عن الرد العام، وده
      // بيسرّب معلومة بسيطة (إن الإيميل ده حساب فعلي اتعمله محاولات كتير)
      // — قبلناها كـ tradeoff عشان تجربة المستخدم الحقيقي تبقى واضحة.
      ensureAttemptWindow(user);
      if (hasExceededAttempts(user)) {
        await user.save(); // نحفظ لو ensureAttemptWindow صفّر النافذة
        return jsonResponse({ error: "too_many_attempts" }, 429);
      }

      const code = generateCode();
      const codeHash = await bcrypt.hash(code, 10);

      user.resetCodeHash = codeHash;
      user.resetCodeExpiry = new Date(Date.now() + CODE_TTL_MS);
      // ⚠️ عمدًا مش بنلمس resetAttempts / resetLastAttemptAt هنا.
      // لو مسحناهم مع كل كود جديد، أي مهاجم كان هيقدر يصفّر عداد
      // محاولاته بمجرد ما يطلب كود جديد ويفضل يخمن من غير حدود فعلية.
      // العداد بيتصفر بس تلقائيًا لما الـ 24 ساعة قفل تعدي من وقت آخر
      // محاولة (شوف ensureAttemptWindow)، أو لما الباسورد يتغيّر بنجاح.
      await user.save();

      await sendResetCodeEmail(email, code, user.name);
    }

    return jsonResponse({ message: "If this email is registered, a code has been sent." }, 200);
  } catch (err) {
    console.error("[/api/forgot-password] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}
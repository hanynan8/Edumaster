// app/lib/registrationHelpers.js
//
// منطق مشترك بين /api/register و /api/register/verify و /api/register/resend
// (تأكيد الإيميل بكود من 6 أرقام قبل إنشاء الحساب) — القواعد متعرّفة هنا مرة
// واحدة عشان تفضل متطابقة في الـ 3 endpoints.

import { randomInt } from "crypto";
import { sendTemplatedEmail } from "@/app/lib/emailHelpers";
import { checkRateLimit } from "@/app/lib/rateLimit";

// صلاحية الكود: 15 دقيقة (زي كود reset الباسورد).
export const VERIFY_CODE_TTL_MS = 15 * 60 * 1000;
// أقصى محاولات تخمين لكل كود. لما تخلص بيتمسح التسجيل المعلّق ويبدأ من الأول.
export const VERIFY_MAX_ATTEMPTS = 5;
// أقل فاصل بين إرسالين لنفس الإيميل.
export const VERIFY_RESEND_COOLDOWN_MS = 60 * 1000;
// 🔒 أقصى عدد أكواد تتبعت في اليوم (24 ساعة) — 5 لكل إيميل و5 لكل IP، والإرسال
// الأول وإعادة الإرسال بيتحسبوا سوا. الواجهة بتعرض للمستخدم العدد المتبقي.
export const DAILY_SEND_LIMIT = 5;
const DAILY_WINDOW_SECONDS = 24 * 60 * 60;

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 🔒 crypto.randomInt بدل Math.random — كود تحقق لازم يبقى غير قابل للتنبؤ.
export function generateVerificationCode() {
  return String(randomInt(100000, 1000000));
}

export function cooldownRemainingSeconds(lastSentAt) {
  if (!lastSentAt) return 0;
  const elapsed = Date.now() - new Date(lastSentAt).getTime();
  return Math.max(0, Math.ceil((VERIFY_RESEND_COOLDOWN_MS - elapsed) / 1000));
}

/**
 * بيبعت إيميل كود التأكيد. بيرجّع true لو الإيميل اتقبل عند Resend.
 * في بيئة التطوير (من غير RESEND_API_KEY) بنطبع الكود في الـ console بدل
 * ما نقفل التسجيل على المطوّر — في production من غير مفتاح بيرجّع false.
 */
export async function sendVerificationCodeEmail({ to, name, code }) {
  if (!process.env.RESEND_API_KEY && process.env.NODE_ENV !== "production") {
    console.warn(`[register] RESEND_API_KEY not set — dev verification code for ${to}: ${code}`);
    return true;
  }

  const safeName = String(name || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const bodyHtml = `
    <p style="font-size:14px;color:#64748b;margin:0 0 24px 0;">
      Hi ${safeName}, use the code below to verify your email and finish creating your Edumaster account. It expires in 15 minutes.
    </p>
    <div style="text-align:center;padding:20px;background:#f8fafc;border-radius:12px;border:1px dashed #C9A227;">
      <span style="font-size:32px;font-weight:900;letter-spacing:8px;color:#1E3561;">${code}</span>
    </div>
    <p style="font-size:12px;color:#94a3b8;margin-top:24px;">
      If you didn't try to sign up, you can safely ignore this email — no account will be created.
    </p>
  `;
  return sendTemplatedEmail({
    to,
    subject: "Your Edumaster verification code",
    heading: "Verify your email",
    bodyHtml,
  });
}

/**
 * بيستهلك إرسال واحد من الحصة اليومية (5/يوم لكل IP و5/يوم لكل إيميل).
 * بيتنادى قبل كل إرسال كود فعلي (التسجيل الأول + إعادة الإرسال).
 * @returns {Promise<{allowed:true, remaining:number, limit:number} |
 *   {allowed:false, scope:"ip"|"email", retryAfterSeconds:number, limit:number}>}
 */
export async function consumeSendQuota(ip, email) {
  const opts = { limit: DAILY_SEND_LIMIT, windowSeconds: DAILY_WINDOW_SECONDS };
  const ipRes = await checkRateLimit(`register-code:ip:${ip}`, opts);
  if (!ipRes.allowed) {
    return { allowed: false, scope: "ip", retryAfterSeconds: ipRes.retryAfterSeconds, limit: DAILY_SEND_LIMIT };
  }
  const emailRes = await checkRateLimit(`register-code:email:${email}`, opts);
  if (!emailRes.allowed) {
    return { allowed: false, scope: "email", retryAfterSeconds: emailRes.retryAfterSeconds, limit: DAILY_SEND_LIMIT };
  }
  return {
    allowed: true,
    remaining: Math.min(ipRes.remaining, emailRes.remaining),
    limit: DAILY_SEND_LIMIT,
  };
}

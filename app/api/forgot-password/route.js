// app/api/forgot-password/route.js
//
// الخطوة الأولى في نسيان الباسورد: المستخدم يبعت إيميله، لو موجود بنبعتله
// كود مكوّن من 6 أرقام على إيميله. بنخزن الـ hash بتاع الكود بس (مش الكود
// نفسه) في الداتابيز، بالظبط زي ما بنعامل الباسورد.

import bcrypt from "bcryptjs";
import { connectToMongo, getAuthModel } from "@/app/lib/mongodb";
import { CODE_TTL_MS } from "@/app/lib/resetPasswordHelpers";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";

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
// بالإيميل)، اللي بيحدد الأمان الفعلي هو محدودية "الإرسال" هنا +
// محدودية "التخمين" في resetPasswordHelpers (5 محاولات/12 ساعة لكل حساب).
function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// 🔒 SECURITY (تعديل مقصود): حد إرسال الكود بقى بالكامل على مستوى الـ IP —
// 3 محاولات إرسال (أول مرة + أي resend) كل 24 ساعة لكل IP، بغض النظر عن
// الإيميل المُدخل، وبغض النظر عن كون الحساب موجود أصلاً ولا لأ. مفيش أي
// تتبّع أو قفل على مستوى الحساب هنا خالص — لو IP معيّن استهلك الـ 3
// محاولات (حتى لو على إيميلات مختلفة كل مرة)، بيتقفل لمدة يوم كامل.
// ده منفصل تمامًا عن حد "تخمين الكود" (5 محاولات/12 ساعة لكل حساب) في
// /api/verify-reset-code و /api/reset-password، اللي فضل زي ما هو.
const SEND_CODE_IP_LIMIT = { limit: 3, windowSeconds: 24 * 60 * 60 };

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

    // 🔒 SECURITY: الفحص الوحيد قبل أي حاجة تانية — بالكامل على مستوى الـ
    // IP، قبل حتى ما نستعلم عن الداتابيز. لو الـ IP استهلك الـ 3 محاولات،
    // بيترفض فورًا من غير أي فرق حسب الإيميل المُدخل.
    const ip = getClientIp(request);
    const ipCheck = await checkRateLimit(`forgot-password:send:ip:${ip}`, SEND_CODE_IP_LIMIT);
    if (!ipCheck.allowed) {
      return jsonResponse(
        { error: "too_many_requests", retryAfterSeconds: ipCheck.retryAfterSeconds },
        429
      );
    }

    await connectToMongo();
    const AuthModel = getAuthModel();
    const user = await AuthModel.findOne({ email });

    // 🔒 SECURITY: نرجع نفس الرد ونفس عدد المحاولات المتبقية سواء الإيميل
    // موجود أو لأ — عشان مانديش لأي حد فرصة يعرف مين مسجل في الموقع ومين
    // لأ (user enumeration). بما إن العداد بقى IP-based بالكامل، الرد
    // متطابق 100% دلوقتي بين الحالتين.
    if (user) {
      const code = generateCode();
      const codeHash = await bcrypt.hash(code, 10);

      user.resetCodeHash = codeHash;
      user.resetCodeExpiry = new Date(Date.now() + CODE_TTL_MS);
      // ⚠️ عمدًا مش بنلمس resetAttempts / resetLastAttemptAt هنا — دول
      // خاصين بحد "تخمين الكود" في /api/verify-reset-code، مش بحد
      // "الإرسال" اللي عدّلناه هنا، وكل واحد فيهم منفصل عن التاني عمدًا.
      await user.save();

      await sendResetCodeEmail(email, code, user.name);
    }

    return jsonResponse(
      {
        message: "If this email is registered, a code has been sent.",
        remainingAttempts: ipCheck.remaining,
      },
      200
    );
  } catch (err) {
    console.error("[/api/forgot-password] POST error:", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
}